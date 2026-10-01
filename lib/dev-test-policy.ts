export function devTestingEnabled(){return process.env.NODE_ENV==='development'&&process.env.DEV_TEST_USERS_ENABLED==='true';}
export function allowTestSession(testMode:unknown){return testMode!==true||devTestingEnabled();}
