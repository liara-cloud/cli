import path from "path";

import fs from "fs-extra";

const getAllFiles = (dirPath: string, arrOfFiles?: string[]): string[] => {
  let arraysOfFile = arrOfFiles || [];

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arraysOfFile = getAllFiles(dirPath + "/" + file, arraysOfFile);
    } else {
      arraysOfFile.push(path.join(dirPath, "/", file));
    }
  });
  return arraysOfFile;
};


export default getAllFiles;