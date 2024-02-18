import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

class GoogleSheet {
  doc: GoogleSpreadsheet;
  scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ];
  title = 'Logs';

  constructor() {
    const jwt = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: this.scopes,
    });

    this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);
  }

  async load() {
    await this.doc.loadInfo();
  }

  get sheet() {
    return this.doc.sheetsByTitle[this.title];
  }
}

export const googleSheet = new GoogleSheet();
