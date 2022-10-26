const functions = require("firebase-functions");

const { googleSheetCredential } = require("./config");
const { reply } = require("./helpers/line");
const { salaryMessage } = require("./helpers/line/messages");
const { salarySlips } = require("./helpers/line/slips");
const { getGoogleSheetData } = require("./helpers/googleSheets");
const { validateRegistered, registerUser } = require("./helpers/firebase");

exports.lineWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const {
      type,
      message,
      source: { userId: lineUserID },
    } = req.body.events[0];
    const isTextMessage = type === "message" && message.type === "text";

    if (isTextMessage) {
      const messageFromUser = message.text.trim();
      const checkRegister = messageFromUser.split("");
      const needToRegister = checkRegister && checkRegister[1];

      if (needToRegister) {
        const idForRegister = checkRegister[1];
        const hasBeenRegistered = await validateRegistered(lineUserID);

        if (hasBeenRegistered) {
          return replyMessage(req.body, res, "ไม่สามารถลงทะเบียนซ้ำได้");
        }

        const employees = await getGoogleSheetData(
          googleSheetCredential.GOOGLE_SHEET,
          googleSheetCredential.RANGE
        );
        const hasEmployee = employees.values.some(
          ([employeeID]) => employeeID === idForRegister.toString()
        );

        if (!hasEmployee) {
          return replyMessage(req.body, res, "รหัสพนักงานไม่ตรงกับที่มีในระบบ");
        }

        registerUser(lineUserID, idForRegister);
        return replyMessage(req.body, res, "ลงทะเบียนเรียบร้อย");
      } else {
        switch (messageFromUser) {
          case "register":
            return replyMessage(
              req.body,
              res,
              "กรุณากรอกรหัสพนักงาน เช่น รหัส:OGN0123"
            );
          case "salary":
            const hasBeenRegistered = await validateRegistered(lineUserID);

            if (!hasBeenRegistered) {
              return replyMessage(req.body, res, "กรุณาลงทะเบียนก่อนใช้งาน");
            }

            const { idCard } = hasBeenRegistered;
            const employees = await getGoogleSheetData(
              googleSheetCredential.GOOGLE_SHEET,
              googleSheetCredential.RANGE
            );
            const me = employees.values.filter(
              ([employeeID]) => employeeID === idCard.toString()
            )[0];

            return replyMessage(req.body, res, salaryMessage(me), "flex");
          case "slips":
            const hasBeenRegisteredSlips = await validateRegistered(lineUserID);

            if (!hasBeenRegisteredSlips) {
              return replyMessage(req.body, res, "กรุณาลงทะเบียนก่อนใช้งาน");
            }

            const { idSlips } = hasBeenRegisteredSlips;
            const employeesSlips = await getGoogleSheetData(
              googleSheetCredential.GOOGLE_SHEET,
              googleSheetCredential.RANGE
            );
            const meSlips = employeesSlips.values.filter(
              ([employeeID]) => employeeID === idSlips.toString()
            )[0];

            // return replyMessage(req.body, res, "สลิปเงินเดือน");
            return replyMessage(req.body, res, salarySlips(), "flex");
        }
      }
    }

    res.status(200).send("ok");
  } catch (error) {
    console.error(error.message);
    res.status(400).send("error");
  }
});

const replyMessage = (bodyRequest, res, message, type) => {
  reply(bodyRequest, message, type);

  return res.status(200).send("ok");
};
