// // pushNotification.js
// import { messaging, getToken, onMessage } from "@/lib/firebase";

// export const requestPermission = async () => {
//   try {
//     const currentToken = await getToken(messaging, {
//       vapidKey: "BJR3c-k3SRZ5VgjY2XguP9c9u_EtqR5gZ1I0AfnUGnhgEPGYyepRzucYb2w6248d9rBdsIoyLLERAvkPk2SGsVM",
//     });

//     if (currentToken) {
//       console.log("Push Token:", currentToken);
//     } else {
//       console.log("No registration token available.");
//     }
//   } catch (err) {
//     console.error("An error occurred while retrieving token. ", err);
//   }
// };

// export const onMessageListener = () =>
//   new Promise((resolve) => {
//     onMessage(messaging, (payload) => {
//       resolve(payload);
//     });
//   });
