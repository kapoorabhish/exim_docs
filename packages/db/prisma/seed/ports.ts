// UN/LOCODE port data — Indian ports + major international ports
// portType: SEA | AIR | ICD | LAND
export const ports = [
  // ─── India: Major Seaports ───────────────────────────────
  { code: 'INNSA', name: 'Nhava Sheva (JNPT)', country: 'IN', portType: 'SEA' as const },
  { code: 'INMUN', name: 'Mumbai Port', country: 'IN', portType: 'SEA' as const },
  { code: 'INMAA', name: 'Chennai (Madras)', country: 'IN', portType: 'SEA' as const },
  { code: 'INCCU', name: 'Kolkata', country: 'IN', portType: 'SEA' as const },
  { code: 'INKTP', name: 'Kandla (Deendayal)', country: 'IN', portType: 'SEA' as const },
  { code: 'INCOK', name: 'Kochi (Cochin)', country: 'IN', portType: 'SEA' as const },
  { code: 'INVTZ', name: 'Visakhapatnam', country: 'IN', portType: 'SEA' as const },
  { code: 'INTUT', name: 'Tuticorin (V.O. Chidambaranar)', country: 'IN', portType: 'SEA' as const },
  { code: 'INMRM', name: 'Mundra', country: 'IN', portType: 'SEA' as const },
  { code: 'INPAV', name: 'Pipavav (RPCL)', country: 'IN', portType: 'SEA' as const },
  { code: 'INHZR', name: 'Hazira (Surat)', country: 'IN', portType: 'SEA' as const },
  { code: 'INPRT', name: 'Paradip', country: 'IN', portType: 'SEA' as const },
  { code: 'INMNG', name: 'Mangalore (NMPT)', country: 'IN', portType: 'SEA' as const },
  { code: 'INNML', name: 'New Mangalore', country: 'IN', portType: 'SEA' as const },
  { code: 'INMOR', name: 'Mormugao (Goa)', country: 'IN', portType: 'SEA' as const },
  { code: 'INDAH', name: 'Dahej', country: 'IN', portType: 'SEA' as const },
  { code: 'INKRI', name: 'Krishnapatnam', country: 'IN', portType: 'SEA' as const },
  { code: 'INKAT', name: 'Kamarajar (Ennore)', country: 'IN', portType: 'SEA' as const },
  { code: 'INSYZ', name: 'Syama Prasad Mookerjee (Kolkata Dock)', country: 'IN', portType: 'SEA' as const },
  { code: 'INHAL', name: 'Haldia', country: 'IN', portType: 'SEA' as const },

  // ─── India: Major Airports ───────────────────────────────
  { code: 'INDEL', name: 'Delhi (Indira Gandhi International)', country: 'IN', portType: 'AIR' as const },
  { code: 'INBOM', name: 'Mumbai (Chhatrapati Shivaji Maharaj)', country: 'IN', portType: 'AIR' as const },
  { code: 'INBLR', name: 'Bengaluru (Kempegowda International)', country: 'IN', portType: 'AIR' as const },
  { code: 'INHYD', name: 'Hyderabad (Rajiv Gandhi International)', country: 'IN', portType: 'AIR' as const },
  { code: 'INBOM', name: 'Ahmedabad (Sardar Vallabhbhai Patel)', country: 'IN', portType: 'AIR' as const },
  { code: 'INIXM', name: 'Madurai', country: 'IN', portType: 'AIR' as const },
  { code: 'INCCU', name: 'Kolkata (Netaji Subhas Chandra Bose)', country: 'IN', portType: 'AIR' as const },
  { code: 'INMAA', name: 'Chennai (Anna International)', country: 'IN', portType: 'AIR' as const },
  { code: 'INCOK', name: 'Kochi (Cochin International)', country: 'IN', portType: 'AIR' as const },
  { code: 'INPNQ', name: 'Pune', country: 'IN', portType: 'AIR' as const },
  { code: 'INGOI', name: 'Goa (Dabolim / Manohar)', country: 'IN', portType: 'AIR' as const },

  // ─── India: ICDs (Inland Container Depots) ───────────────
  { code: 'INTUGR', name: 'Tughlakabad ICD (Delhi)', country: 'IN', portType: 'ICD' as const },
  { code: 'INPAT', name: 'Patparganj ICD (Delhi)', country: 'IN', portType: 'ICD' as const },
  { code: 'INLUD', name: 'Ludhiana ICD', country: 'IN', portType: 'ICD' as const },
  { code: 'INASR', name: 'Amritsar ICD', country: 'IN', portType: 'ICD' as const },
  { code: 'INPUN', name: 'Pune ICD', country: 'IN', portType: 'ICD' as const },
  { code: 'INSNR', name: 'Sanand ICD (Gujarat)', country: 'IN', portType: 'ICD' as const },
  { code: 'INCOI', name: 'Coimbatore ICD', country: 'IN', portType: 'ICD' as const },
  { code: 'INIRE', name: 'Irugur ICD (Coimbatore)', country: 'IN', portType: 'ICD' as const },
  { code: 'INTIC', name: 'Tiruppur ICD', country: 'IN', portType: 'ICD' as const },
  { code: 'INAGR', name: 'Agra ICD', country: 'IN', portType: 'ICD' as const },
  { code: 'INKNU', name: 'Kanpur ICD', country: 'IN', portType: 'ICD' as const },
  { code: 'INSBI', name: 'Sabarmati ICD (Ahmedabad)', country: 'IN', portType: 'ICD' as const },

  // ─── UAE ─────────────────────────────────────────────────
  { code: 'AEJEA', name: 'Jebel Ali', country: 'AE', portType: 'SEA' as const },
  { code: 'AEAUH', name: 'Abu Dhabi (Khalifa)', country: 'AE', portType: 'SEA' as const },
  { code: 'AEDXB', name: 'Dubai (Port Rashid)', country: 'AE', portType: 'SEA' as const },
  { code: 'AEDXB', name: 'Dubai International Airport', country: 'AE', portType: 'AIR' as const },
  { code: 'AEAUH', name: 'Abu Dhabi International Airport', country: 'AE', portType: 'AIR' as const },
  { code: 'AESHJ', name: 'Sharjah International Airport', country: 'AE', portType: 'AIR' as const },

  // ─── USA ─────────────────────────────────────────────────
  { code: 'USLAX', name: 'Los Angeles / Long Beach', country: 'US', portType: 'SEA' as const },
  { code: 'USNYC', name: 'New York / New Jersey', country: 'US', portType: 'SEA' as const },
  { code: 'USSAV', name: 'Savannah', country: 'US', portType: 'SEA' as const },
  { code: 'USHOU', name: 'Houston', country: 'US', portType: 'SEA' as const },
  { code: 'USSEA', name: 'Seattle / Tacoma', country: 'US', portType: 'SEA' as const },
  { code: 'USORD', name: "Chicago O'Hare", country: 'US', portType: 'AIR' as const },
  { code: 'USJFK', name: 'New York JFK', country: 'US', portType: 'AIR' as const },
  { code: 'USLAX', name: 'Los Angeles International', country: 'US', portType: 'AIR' as const },

  // ─── China ───────────────────────────────────────────────
  { code: 'CNSHA', name: 'Shanghai', country: 'CN', portType: 'SEA' as const },
  { code: 'CNSHK', name: 'Shekou (Shenzhen)', country: 'CN', portType: 'SEA' as const },
  { code: 'CNNBO', name: 'Ningbo-Zhoushan', country: 'CN', portType: 'SEA' as const },
  { code: 'CNGZG', name: 'Guangzhou (Nansha)', country: 'CN', portType: 'SEA' as const },
  { code: 'CNQIN', name: 'Qingdao', country: 'CN', portType: 'SEA' as const },
  { code: 'CNTXG', name: 'Tianjin (Xingang)', country: 'CN', portType: 'SEA' as const },
  { code: 'CNPVG', name: 'Shanghai Pudong', country: 'CN', portType: 'AIR' as const },
  { code: 'CNCAN', name: 'Guangzhou Baiyun', country: 'CN', portType: 'AIR' as const },

  // ─── UK ──────────────────────────────────────────────────
  { code: 'GBLGP', name: 'London Gateway', country: 'GB', portType: 'SEA' as const },
  { code: 'GBFXT', name: 'Felixstowe', country: 'GB', portType: 'SEA' as const },
  { code: 'GBLHR', name: 'London Heathrow', country: 'GB', portType: 'AIR' as const },
  { code: 'GBMAN', name: 'Manchester', country: 'GB', portType: 'AIR' as const },

  // ─── Germany ─────────────────────────────────────────────
  { code: 'DEHAM', name: 'Hamburg', country: 'DE', portType: 'SEA' as const },
  { code: 'DEBRE', name: 'Bremen / Bremerhaven', country: 'DE', portType: 'SEA' as const },
  { code: 'DEFRA', name: 'Frankfurt am Main Airport', country: 'DE', portType: 'AIR' as const },

  // ─── Netherlands ─────────────────────────────────────────
  { code: 'NLRTM', name: 'Rotterdam', country: 'NL', portType: 'SEA' as const },
  { code: 'NLAMS', name: 'Amsterdam Schiphol', country: 'NL', portType: 'AIR' as const },

  // ─── Belgium ─────────────────────────────────────────────
  { code: 'BEANR', name: 'Antwerp', country: 'BE', portType: 'SEA' as const },

  // ─── Singapore ───────────────────────────────────────────
  { code: 'SGSIN', name: 'Singapore (PSA)', country: 'SG', portType: 'SEA' as const },
  { code: 'SGSIN', name: 'Singapore Changi Airport', country: 'SG', portType: 'AIR' as const },

  // ─── Malaysia ────────────────────────────────────────────
  { code: 'MYPKG', name: 'Port Klang', country: 'MY', portType: 'SEA' as const },
  { code: 'MYKUL', name: 'Kuala Lumpur International', country: 'MY', portType: 'AIR' as const },

  // ─── Sri Lanka ───────────────────────────────────────────
  { code: 'LKCMB', name: 'Colombo', country: 'LK', portType: 'SEA' as const },

  // ─── Bangladesh ──────────────────────────────────────────
  { code: 'BDCGP', name: 'Chittagong', country: 'BD', portType: 'SEA' as const },

  // ─── Saudi Arabia ────────────────────────────────────────
  { code: 'SAJED', name: 'Jeddah Islamic', country: 'SA', portType: 'SEA' as const },
  { code: 'SADMM', name: 'Dammam (King Abdul Aziz)', country: 'SA', portType: 'SEA' as const },

  // ─── Australia ───────────────────────────────────────────
  { code: 'AUSYD', name: 'Sydney (Port Botany)', country: 'AU', portType: 'SEA' as const },
  { code: 'AUMEL', name: 'Melbourne', country: 'AU', portType: 'SEA' as const },
  { code: 'AUSYD', name: 'Sydney Kingsford Smith', country: 'AU', portType: 'AIR' as const },

  // ─── Japan ───────────────────────────────────────────────
  { code: 'JPTYO', name: 'Tokyo (Tokyo Port / Yokohama)', country: 'JP', portType: 'SEA' as const },
  { code: 'JPNGO', name: 'Nagoya', country: 'JP', portType: 'SEA' as const },
  { code: 'JPOSA', name: 'Osaka', country: 'JP', portType: 'SEA' as const },
  { code: 'JPNRT', name: 'Tokyo Narita', country: 'JP', portType: 'AIR' as const },

  // ─── South Korea ─────────────────────────────────────────
  { code: 'KRPUS', name: 'Busan', country: 'KR', portType: 'SEA' as const },
  { code: 'KRICN', name: 'Incheon International', country: 'KR', portType: 'AIR' as const },

  // ─── South Africa ────────────────────────────────────────
  { code: 'ZADUR', name: 'Durban', country: 'ZA', portType: 'SEA' as const },
  { code: 'ZACPT', name: 'Cape Town', country: 'ZA', portType: 'SEA' as const },

  // ─── Kenya ───────────────────────────────────────────────
  { code: 'KEMBA', name: 'Mombasa', country: 'KE', portType: 'SEA' as const },

  // ─── Tanzania ────────────────────────────────────────────
  { code: 'TZDAR', name: 'Dar es Salaam', country: 'TZ', portType: 'SEA' as const },

  // ─── Oman ────────────────────────────────────────────────
  { code: 'OMSLL', name: 'Salalah', country: 'OM', portType: 'SEA' as const },
  { code: 'OMMCT', name: 'Muscat (Port Sultan Qaboos)', country: 'OM', portType: 'SEA' as const },

  // ─── Qatar ───────────────────────────────────────────────
  { code: 'QADOH', name: 'Doha (Hamad)', country: 'QA', portType: 'SEA' as const },

  // ─── Hong Kong ───────────────────────────────────────────
  { code: 'HKHKG', name: 'Hong Kong', country: 'HK', portType: 'SEA' as const },
  { code: 'HKHKG', name: 'Hong Kong International Airport', country: 'HK', portType: 'AIR' as const },

  // ─── Italy ───────────────────────────────────────────────
  { code: 'ITGOA', name: 'Genoa', country: 'IT', portType: 'SEA' as const },
  { code: 'ITVCE', name: 'Venice', country: 'IT', portType: 'SEA' as const },

  // ─── France ──────────────────────────────────────────────
  { code: 'FRLEH', name: 'Le Havre', country: 'FR', portType: 'SEA' as const },
  { code: 'FRCDG', name: 'Paris Charles de Gaulle', country: 'FR', portType: 'AIR' as const },

  // ─── Spain ───────────────────────────────────────────────
  { code: 'ESVLC', name: 'Valencia', country: 'ES', portType: 'SEA' as const },
  { code: 'ESBCN', name: 'Barcelona', country: 'ES', portType: 'SEA' as const },
];