/**
 * 检查Excel文件的列名
 */

import XLSX from 'xlsx';
import { resolve } from 'path';

const docPath = resolve(process.cwd(), '.doc');

// 检查ph学校的成绩表
console.log('📊 检查ph学校成绩表的列名\n');

console.log('1️⃣ ph七上期中成绩.xlsx');
const phMidterm = XLSX.readFile(resolve(docPath, 'ph七上期中成绩.xlsx'));
const phMidtermSheet = phMidterm.Sheets[phMidterm.SheetNames[0]];
const phMidtermData: any[] = XLSX.utils.sheet_to_json(phMidtermSheet);

if (phMidtermData.length > 0) {
  console.log('列名:', Object.keys(phMidtermData[0]));
  console.log('第一行样本数据:');
  console.log(phMidtermData[0]);
}

console.log('\n2️⃣ ph七上期末成绩.xlsx');
const phFinal = XLSX.readFile(resolve(docPath, 'ph七上期末成绩.xlsx'));
const phFinalSheet = phFinal.Sheets[phFinal.SheetNames[0]];
const phFinalData: any[] = XLSX.utils.sheet_to_json(phFinalSheet);

if (phFinalData.length > 0) {
  console.log('列名:', Object.keys(phFinalData[0]));
  console.log('第一行样本数据:');
  console.log(phFinalData[0]);
}

// 检查zx学校的成绩表
console.log('\n\n📊 检查zx学校成绩表的列名\n');

console.log('3️⃣ zx八下期末成绩表.xlsx');
const zxMidterm = XLSX.readFile(resolve(docPath, 'zx八下期末成绩表.xlsx'));
const zxMidtermSheet = zxMidterm.Sheets[zxMidterm.SheetNames[0]];
const zxMidtermData: any[] = XLSX.utils.sheet_to_json(zxMidtermSheet);

if (zxMidtermData.length > 0) {
  console.log('列名:', Object.keys(zxMidtermData[0]));
  console.log('第一行样本数据:');
  console.log(zxMidtermData[0]);
}

console.log('\n4️⃣ zx九上期末成绩表.xlsx');
const zxFinal = XLSX.readFile(resolve(docPath, 'zx九上期末成绩表.xlsx'));
const zxFinalSheet = zxFinal.Sheets[zxFinal.SheetNames[0]];
const zxFinalData: any[] = XLSX.utils.sheet_to_json(zxFinalSheet);

if (zxFinalData.length > 0) {
  console.log('列名:', Object.keys(zxFinalData[0]));
  console.log('第一行样本数据:');
  console.log(zxFinalData[0]);
}
