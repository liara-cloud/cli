interface IipcSendLog {
  log: string,
  state: string,
  status: string
}

export const ipcSendLog = (message: IipcSendLog)=>{
  process.send && process.send(message) 
}
