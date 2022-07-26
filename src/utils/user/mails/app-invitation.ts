/**
 * Email template for invitation to an application.
 * Generated with Thunderbird and the ThunderHTMLEdit extension.
 * Design based on Github invitation emails.
 *
 * @param username The name of the user who created the invitation
 * @param appName The name of the application
 * @param url The url of the application
 * @returns A string representing the html body of the mail
 */
export const makeAppInvitationEmailBody = (
  username: string,
  appName: string,
  url: string
) =>
  `<!DOCTYPE html><html>
  <head>
    <meta http-equiv="content-type" content="text/html; charset=">
  </head>
  <body style="box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica,
    Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;; font-size: 14px; line-height: 1.5;
    color: rgb(36, 41, 46); margin: 0px;" bgcolor="#fff">
    <div style="max-width: 400px; margin: 2rem auto; padding: 1rem; text-align: center; border: #ddd solid
      1px; border-radius: 5px">
      <meta http-equiv="Content-Type" content="text/html; charset=">
      <meta name="viewport" content="width=device-width">
      <img src="https://doc.oortcloud.tech/img/logo.png" style="max-width:220px;margin: 1rem 0 2rem 0" alt="Oort - Data management system" >
      <h3 class="lh-condensed" style="box-sizing: border-box; margin-top: 0; margin-bottom: 0; font-size: 20px;
        font-weight: 600; line-height: 1.25 !important; font-family: -apple-system,BlinkMacSystemFont,&quot;Segoe
        UI&quot;,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot; !important;">${username}
        has invited you to join the ${appName} application<br>
        <br>
      </h3>
      <p style="box-sizing: border-box; margin-top: 0; margin-bottom: 10px; font-family:
        -apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif,&quot;Apple Color
        Emoji&quot;,&quot;Segoe UI Emoji&quot; !important;">  ${username} has invited you to join the
        ${appName} application on Oort. <br>
      </p>
      <p>You can access this application by clicking the button below:</p>
      <p><a href="${url}" target="_blank" moz-do-not-send="true" style="background-color: rgb(111, 81, 174); color:
          rgb(255, 255, 255); text-decoration-line: none; font-weight: 500; line-height: 3; white-space: nowrap;
          vertical-align: middle; border-radius: 0.5em; padding: .8em 1em">Open the application</a></p>
      <p class="email-body-subtext" style="box-sizing: border-box; margin-top: 0; margin-bottom: 10px; font-family:
        -apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif,&quot;Apple Color
        Emoji&quot;,&quot;Segoe UI Emoji&quot; !important;"><strong style="font-weight: 600; box-sizing: border-box;
          font-family: -apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif,&quot;Apple
          Color Emoji&quot;,&quot;Segoe UI Emoji&quot; !important;">Note:</strong> If you get a 404 page, make sure
        you’re signed with your account. You can also access the application page directly at <a href="${url}"
          style="background-color: transparent; box-sizing: border-box; color: #0366d6; text-decoration: none;
          font-family: -apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif,&quot;Apple
          Color Emoji&quot;,&quot;Segoe UI Emoji&quot; !important;" moz-do-not-send="true" class="moz-txt-link-freetext">${url}</a>.</p>
      <br>
      <p class="f6 text-gray-light" style="box-sizing: border-box; text-align: center; margin-top: 0; margin-bottom:
        10px; color: #6a737d !important; font-size: 12px !important; font-family:
        -apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif,&quot;Apple Color
        Emoji&quot;,&quot;Segoe UI Emoji&quot; !important;">Oort Cloud Technology ・Calle Penas, 70, 28410 Manzanares el
        Real ・Madrid Spain - B87964946<br>
      </p>
    </div>
  </body>
  </html>
  `;
