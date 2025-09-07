import { getJson } from 'serpapi';
import dotenv from 'dotenv';

process.env.SERPAPI_KEY = 'e06ba31a63f77c97674055e134ebdceb92646c680cc9c68ac4f34fee9abfec35';

getJson(
  {
    q: '美妝保養品電商，台灣有哪些擅長內容操作的SEO公司？',
    api_key: process.env.SERPAPI_KEY,
    location_requested: 'Taipei, Taiwan',
    location_used: 'Taipei,Taiwan',
    google_domain: 'google.com.tw',
    hl: 'zh-tw',
    gl: 'tw',
  },
  json => {
    console.log(json['ai_overview']);
  }
);
