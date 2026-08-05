import {defineConfig,devices} from '@playwright/test'

export default defineConfig({
  testDir:'./tests/e2e',
  workers:1,
  fullyParallel:false,
  retries:0,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure'},
  webServer:{command:'NEXT_DIST_DIR=.next-playwright npm run dev -- --hostname 127.0.0.1 --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:true,timeout:120000},
  projects:[
    {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'tablet',use:{...devices['iPad (gen 7)'],browserName:'chromium'}},
    {name:'mobile',use:{...devices['iPhone 13'],browserName:'chromium'}},
  ],
})
