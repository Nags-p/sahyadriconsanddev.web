// This file acts as our simple database for all projects.
const projectsData = [
  {
    id: 1,
    title: 'Luxury Villa, Pune',
    subtitle: 'A modern 4-bedroom villa with smart home integration.',
    mainImage: 'images/project1-main.jpg',
    galleryImages: [
      'images/project1-main.jpg',
      'images/project1-interior.jpg',
      'images/project1-kitchen.jpg',
      'images/project1-pool.jpg'
    ],
    vision: 'The client envisioned a home that blended modern architectural aesthetics with seamless smart home technology.',
    solution: 'Sahyadri Constructions delivered a complete turnkey solution, managing the project from architectural design to final landscaping. Key features include an open-plan living area and Italian marble flooring.',
    client: 'Rohan Sharma',
    location: 'Koregaon Park, Pune',
    year: '2023',
    type: 'Residential Construction',
    scope: '4,200 sq. ft., 4 BHK Villa'
  },
  {
    id: 2,
    title: 'Orion Commercial Hub',
    subtitle: 'A 10-story commercial complex in the heart of the city.',
    mainImage: 'images/project2.jpg',
    galleryImages: [
      'images/project2.jpg',
      'images/project2-lobby.jpg',
      'images/project2-office.jpg'
    ],
    vision: 'To create a modern, energy-efficient commercial space that attracts premium businesses.',
    solution: 'We constructed a state-of-the-art building with a glass facade, high-speed elevators, and a centralized HVAC system, completing the project ahead of schedule.',
    client: 'Tech Solutions Inc.',
    location: 'Bandra, Mumbai',
    year: '2022',
    type: 'Commercial Construction',
    scope: '80,000 sq. ft. Office Space'
  },
  {
    id: 3,
    title: 'Apartment Renovation',
    subtitle: 'Complete interior and exterior remodel of a residential building.',
    mainImage: 'images/project3.jpg',
    galleryImages: [
      'images/project3.jpg',
      'images/project3-before.jpg',
      'images/project3-after.jpg'
    ],
    vision: 'To modernize a 20-year-old apartment building, improving its aesthetics, safety, and property value.',
    solution: 'Our team handled structural repairs, complete re-plastering and painting, updated all common areas, and landscaped the exterior grounds.',
    client: 'Galaxy Apartments Society',
    location: 'Jayanagar, Bangalore',
    year: '2023',
    type: 'Renovation & Remodeling',
    scope: '30-Unit Apartment Complex'
  }
  // To add more projects, just copy the block above and change the data.
];