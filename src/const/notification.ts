import parse from 'node-html-parser';

/**
 *
 */
export const emailElement = parse(`<!DOCTYPE HTML>
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">

    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0;">
        <title>EMSPOC - Email Alert</title>
    </head>

    <body leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" style="width: 100%; background-color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <table border="0" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td height="30"></td>
            </tr>
            <tr bgcolor="#4c4e4e">
                <td width="100%" align="center" valign="top" bgcolor="#ffffff">
                    <!----------   main content----------->
                    <table id="mainTable" width="800" style="border: 3px solid #00205c; margin: 0 auto;" cellpadding="0" cellspacing="0" bgcolor="#fff">

                    </table>
                    <!----------   end main content----------->
                </td>
            </tr>
        </table>
    </body>

    </html>`);
