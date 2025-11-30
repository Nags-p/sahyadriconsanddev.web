// projects-data.js
const projectsData = [
  {
    id: 1,
    title: 'Luxury Villa, Pune',
    subtitle: 'Smart 4-bedroom villa with biophilic courtyards and automation.',
    galleryImages: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1600&auto=format&fit=crop', // Villa Ext
      'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?q=80&w=1600&auto=format&fit=crop', // Interior
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?q=80&w=1600&auto=format&fit=crop'  // Pool
    ],
    vision: 'Blend contemporary tropical architecture with discreet smart-home technology so that every space feels bright, airy, and secure.',
    challenge: 'Irregular terrain and 9.5m municipal height limits required a stepped structural grid and soil-retaining strategy to achieve the client’s spatial brief.',
    solution: 'We engineered a split-level RCC frame with post-tensioned slabs, added lateral bracing to manage wind loads, and integrated Schneider smart-home systems across HVAC, lighting, and security.',
    results: 'Delivered the villa 18 days early with 12% lower energy consumption than a comparable build, plus a 4.8/5 homeowner satisfaction score.',
    client: 'Rohan Sharma',
    location: 'Koregaon Park, Pune',
    year: '2023',
    type: 'Residential',
    scope: '4,200 sq. ft. | G+1 luxury villa with plunge pool',
    services: ['Structural design & approvals', 'Full turnkey construction', 'Smart automation', 'Landscape & interiors']
  },
  {
    id: 2,
    title: 'Orion Commercial Hub',
    subtitle: '10-story LEED Gold certified commercial tower with retail podium.',
    galleryImages: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop', // Building
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop', // Office
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1600&auto=format&fit=crop'  // Lobby
    ],
    vision: 'Create a premium commercial landmark that attracts marquee tenants and operates with low energy intensity.',
    challenge: 'A tight 40 ft. frontage on a high-traffic arterial road demanded night-time material delivery windows and vibration monitoring for adjacent structures.',
    solution: 'Used composite steel-RCC construction, prefabricated façade panels, and a centralized IBMS system. Logistics were sequenced using BIM 4D simulations to avoid traffic penalties.',
    results: 'Completed two months ahead of schedule, secured LEED Gold, and achieved 96% occupancy within 45 days of handover.',
    client: 'Tech Solutions Inc.',
    location: 'Bandra, Mumbai',
    year: '2022',
    type: 'Commercial',
    scope: '80,000 sq. ft. | 2-level retail + 8-level offices',
    services: ['Concept-to-completion delivery', 'Façade engineering', 'MEP design & execution', 'Fit-outs coordination']
  },
  {
    id: 3,
    title: 'Galaxy Heights Revamp',
    subtitle: 'Phased renovation of a 30-unit apartment community while occupied.',
    galleryImages: [
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?q=80&w=1600&auto=format&fit=crop', // Exterior Paint
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1600&auto=format&fit=crop', // Corridor
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1600&auto=format&fit=crop'  // Entrance
    ],
    vision: 'Upgrade safety, façade identity, and amenities of a 20-year-old building without displacing residents.',
    challenge: 'Work sequencing had to minimize noise/dust, maintain fire exits, and keep services live for all families staying on site.',
    solution: 'Executed in six micro-phases, created temporary access corridors, installed new fire-fighting lines, retrofitted structural jackets, and delivered contemporary lobby/common areas.',
    results: 'Property value jumped ~30%, maintenance issues dropped 60%, and resident feedback surveys averaged 4.6/5.',
    client: 'Galaxy Apartments Society',
    location: 'Jayanagar, Bangalore',
    year: '2024',
    type: 'Renovation',
    scope: '30 apartments | façade, lobby, MEP & structural retrofit',
    services: ['Structural retrofitting', 'Common area interior design', 'MEP upgrades', 'Society handover documentation']
  },
  {
    id: 4,
    title: 'Zenith Interiors Lab',
    subtitle: 'Experience center showcasing premium interior systems for a tech firm.',
    galleryImages: [
      'https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1600&auto=format&fit=crop', // Interior 1
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=80&w=1600&auto=format&fit=crop', // Interior 2
      'https://images.unsplash.com/photo-1600566752355-35792bedcfe1?q=80&w=1600&auto=format&fit=crop'  // Kitchen
    ],
    vision: 'Design an immersive, modular interior lab for client demos with rapid reconfiguration capability.',
    challenge: 'The site was within an occupied office floor, so noise, vibration, and dust mitigation were critical along with overnight work windows.',
    solution: 'Adopted modular wall systems, acoustic isolation mats, custom lighting tracks, and concealed services so layouts can be reworked in hours.',
    results: 'Client reduced prototype launch timelines by 25% and now hosts 15+ walkthroughs monthly.',
    client: 'Zenith Tech Labs',
    location: 'Hitech City, Hyderabad',
    year: '2023',
    type: 'Interiors',
    scope: '8,500 sq. ft. experience + collaboration lab',
    services: ['Interior concept & 3D visualization', 'Joinery & finishes', 'Acoustics and lighting', 'Fast-track execution']
  }
];