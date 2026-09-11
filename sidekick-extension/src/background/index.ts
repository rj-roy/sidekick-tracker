import { API_BASE_URL, OPEN_SIGN_IN_MESSAGE } from "../shared/constants/api";

chrome.runtime.onInstalled.addListener(() => {
  console.log("SideKick background installed");
});

// chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
//   if (message?.type === OPEN_SIGN_IN_MESSAGE) {
//     chrome.tabs.create({
//       url: `${API_BASE_URL}/api/auth/google/login`,
//       active: true,
//     });
//     sendResponse({ ok: true });
//   }
//   return true;
// });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  switch(message?.type){

    case OPEN_SIGN_IN_MESSAGE:
      chrome.tabs.create({
        url: `${API_BASE_URL}/auth/google/login`,
        active: true,
      });
      return sendResponse({ok: true});

    case "l" :
      return null;

  };

});
