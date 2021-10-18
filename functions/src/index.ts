import * as express from 'express';
import { Request, Response } from 'express';
import * as functions from 'firebase-functions';
import * as multer from 'multer';
import vision from '@google-cloud/vision';

const credentials = require('./service-account-key-file.json')
const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5000000 } });

const client = new vision.ImageAnnotatorClient({ credentials });

async function getTextFromFiles(file: Buffer) {
  const [result] = await client.textDetection(file);
  const detections = result.textAnnotations;
  // const textList = [] as string[];
  console.log('Text:');
  if (!detections) return;
  detections.forEach(text => {
    console.log(text);
    // textList.push(text);
  });
}

app.get('hello', (req: Request, res: Response) => {
  return res.send('hello');
})

app.post('upload', upload.single('receipt'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.json({ success: false });
  await getTextFromFiles(file.buffer);
  return res.json({ success: true });
})

exports.magic = functions.https.onRequest(app);
