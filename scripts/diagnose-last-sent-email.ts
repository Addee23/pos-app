import "dotenv/config";
import tls from "node:tls";

const SUBJECT_PART = process.env.EMAIL_DIAG_SUBJECT ?? "TEST-UTAN-BILAGOR";
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!user || !pass) {
  throw new Error("SMTP_USER och SMTP_PASS behövs i .env för IMAP-diagnos.");
}

const imapUser = user;
const imapPass = pass;

type PendingCommand = {
  tag: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
};

const socket = tls.connect(993, "imap.gmail.com", {
  servername: "imap.gmail.com",
});

let buffer = "";
let commandCounter = 0;
let pending: PendingCommand | null = null;

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function send(command: string): Promise<string> {
  if (pending) {
    throw new Error("IMAP-kommandon körs redan");
  }

  const tag = `A${++commandCounter}`;
  socket.write(`${tag} ${command}\r\n`);

  return new Promise((resolve, reject) => {
    pending = { tag, resolve, reject };
  });
}

function waitForGreeting(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("IMAP hälsning tog för lång tid")),
      15000,
    );

    socket.once("data", (chunk) => {
      clearTimeout(timeout);
      buffer += chunk.toString("utf8");
      resolve();
    });
  });
}

socket.on("data", (chunk) => {
  buffer += chunk.toString("utf8");

  if (!pending) {
    return;
  }

  const doneLine = new RegExp(`(?:^|\\r?\\n)${pending.tag} (OK|NO|BAD)`, "m");
  const doneMatch = buffer.match(doneLine);
  if (!doneMatch) {
    return;
  }

  const response = buffer;
  buffer = "";
  const current = pending;
  pending = null;

  if (doneMatch[1] === "OK") {
    current.resolve(response);
  } else {
    current.reject(new Error(response));
  }
});

socket.on("error", (error) => {
  if (pending) {
    pending.reject(error);
    pending = null;
  }
});

function parseSentMailbox(listResponse: string): string | null {
  const sentLine = listResponse
    .split(/\r?\n/)
    .find((line) => /\\Sent/i.test(line));

  if (!sentLine) {
    return null;
  }

  const quoted = [...sentLine.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  return quoted.at(-1) ?? null;
}

function count(pattern: RegExp, value: string): number {
  return value.match(pattern)?.length ?? 0;
}

async function main() {
  await waitForGreeting();
  await send(`LOGIN ${quote(imapUser)} ${quote(imapPass)}`);

  const list = await send('LIST "" "*"');
  const sentMailbox = parseSentMailbox(list);
  if (!sentMailbox) {
    throw new Error("Hittade ingen Gmail Skickat-mapp via IMAP.");
  }

  await send(`SELECT ${quote(sentMailbox)}`);
  const search = await send(`UID SEARCH SUBJECT ${quote(SUBJECT_PART)}`);
  const ids = search
    .split(/\r?\n/)
    .find((line) => line.startsWith("* SEARCH"))
    ?.replace("* SEARCH", "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const latestId = ids?.at(-1);
  if (!latestId) {
    throw new Error(`Hittade inget skickat mail med ämne som innehåller ${SUBJECT_PART}.`);
  }

  const raw = await send(`UID FETCH ${latestId} BODY.PEEK[]`);

  const diagnosis = {
    sentMailbox,
    uid: latestId,
    subjectPart: SUBJECT_PART,
    hasCid: /cid:/i.test(raw) || /Content-ID:/i.test(raw),
    attachmentHeaders: count(/Content-Disposition:\s*attachment/gi, raw),
    inlineDispositionHeaders: count(/Content-Disposition:\s*inline/gi, raw),
    imageMimeParts: count(/Content-Type:\s*image\//gi, raw),
    multipartRelated: /multipart\/related/i.test(raw),
    htmlImgTags: count(/<img\b/gi, raw),
    proxiedImageUrls: count(/images\.weserv\.nl/gi, raw),
    directExternalUrls: count(/https?:\/\//gi, raw),
    imageSnippets: raw
      .match(/<img\b[\s\S]{0,260}/gi)
      ?.map((snippet) => snippet.replace(/\s+/g, " ").slice(0, 260)) ?? [],
  };

  console.log(JSON.stringify(diagnosis, null, 2));

  await send("LOGOUT");
  socket.end();
}

main().catch((error) => {
  console.error(error);
  socket.end();
  process.exit(1);
});
