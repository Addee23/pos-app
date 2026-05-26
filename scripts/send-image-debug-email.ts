import "dotenv/config";
import { createMailTransporter, resolveSmtpConfig } from "../src/lib/mail";

async function main() {
  const config = resolveSmtpConfig();
  const transporter = createMailTransporter(config);
  const stamp = new Date().toLocaleTimeString("sv-SE");

  const subject = `BILDTEST JPG PNG ${stamp}`;
  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;">
      <h1>${subject}</h1>
      <p>Om Gmail visar externa JPG/PNG-bilder ska två bilder synas här under.</p>
      <img
        src="https://dummyimage.com/600x240/1a4d5c/ffffff.jpg?text=JPG+BILD+I+MAIL"
        width="600"
        alt="JPG bildtest"
        style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:16px 0;"
      />
      <img
        src="https://dummyimage.com/600x240/c9a227/ffffff.png?text=PNG+BILD+I+MAIL"
        width="600"
        alt="PNG bildtest"
        style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:16px 0;"
      />
    </div>
  `;

  const info = await transporter.sendMail({
    from: config.from,
    to: "adiiinaaaa86@gmail.com",
    subject,
    text: subject,
    html,
  });

  console.log(
    JSON.stringify(
      {
        subject,
        accepted: info.accepted,
        messageId: info.messageId,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
