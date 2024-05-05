import * as nodemailer from "nodemailer";
import { SES, SendRawEmailCommand } from "@aws-sdk/client-ses";

const AWS_REGION = process.env.AWS_REGION!;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

const SENDING_RATE = parseInt(process.env.AWS_SES_EMAILS_PER_SECOND!);

const transporter = nodemailer.createTransport({
  SES: {
    ses: new SES({
      apiVersion: "2010-12-01",
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    }),
    aws: { SendRawEmailCommand },
  },
  sendingRate: SENDING_RATE,
});

export async function sendSignupEmail() {
  transporter.once("idle", () => {
    if (transporter.isIdle()) {
      transporter.sendMail(
        {
          from: "sayremitch@gmail.com",
          to: "sayremitch@gmail.com",
          subject: "Message",
          text: "I hope this message gets sent!",
          // ses: {
          //   // optional extra arguments for SendRawEmail
          //   Tags: [
          //     {
          //       Name: "tag_name",
          //       Value: "tag_value",
          //     },
          //   ],
          // },
        },
        (err, info) => {
          console.log(info.envelope);
          console.log(info.messageId);
          console.log("error here", err);
        }
      );
    }
  });
}
