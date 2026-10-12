export const DOMAINS = [
  {
    id: 'general',
    name: 'General Assistant',
    teluguName: 'సాధారణ సహాయకుడు',
    badge: 'Versatile',
    iconName: 'Sparkles',
    description: 'Everyday inquiries, writing, summaries, and broad knowledge synthesis in English and Telugu.',
    examples: [
      {
        title: 'Bilingual Everyday Explainer',
        prompt: 'Explain how solar panels work in simple terms. Can you also summarize the main point in Telugu (తెలుగు)?',
      },
      {
        title: 'Telugu Daily Proverbs',
        prompt: 'తెలుగులో ప్రముఖ సామెతలు (Famous Telugu proverbs) మరియు వాటి అర్థాలను ఆంగ్ల అనువాదంతో వివరించండి.',
        isTelugu: true,
      },
      {
        title: 'Critical Thinking Dilemma',
        prompt: 'Compare renewable energy transition challenges for developing vs developed nations.',
      },
    ],
  },
  {
    id: 'coding',
    name: 'Programming & Dev',
    teluguName: 'ప్రోగ్రామింగ్ & కోడింగ్',
    badge: 'Code Engine',
    iconName: 'Code2',
    description: 'Algorithms, full-stack architecture, debugging, code generation, and complexity analysis.',
    examples: [
      {
        title: 'LRU Cache Implementation',
        prompt: 'Write a JavaScript generic LRU Cache with O(1) get and put operations, including unit tests and edge cases.',
      },
      {
        title: 'Python Async Scraper',
        prompt: 'Show how to use Python asyncio and httpx for concurrent rate-limited API fetching with exponential backoff.',
      },
      {
        title: 'Code in Telugu & English',
        prompt: 'రియాక్ట్ (React) లో useState మరియు useEffect హుక్స్ ఎలా పని చేస్తాయో తెలుగు మరియు ఇంగ్లీష్ లో సరళమైన ఉదాహరణతో వివరించండి.',
        isTelugu: true,
      },
    ],
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Farming',
    teluguName: 'వ్యవసాయం & రైతు సలహా',
    badge: 'Agri Advisor',
    iconName: 'Sprout',
    description: 'Crop cycles, soil health, drip irrigation, pest prevention guidelines, and sustainable farming.',
    examples: [
      {
        title: 'Cotton Pest Prevention',
        prompt: 'What are sustainable integrated pest management (IPM) practices for pink bollworm in cotton crops? Include organic prevention methods.',
      },
      {
        title: 'వరి సాగు & ఎరువుల యాజమాన్యం',
        prompt: 'ఖరీఫ్ సీజన్‌లో వరి పంటకు సమతుల్య ఎరువుల యాజమాన్యం (NPK ratio) మరియు నీటి సంరక్షణ పద్ధతులను తెలుగులో వివరించండి.',
        isTelugu: true,
      },
      {
        title: 'Drip Irrigation & Soil Health',
        prompt: 'How can smallholders improve organic carbon in red sandy soil using green manure and cover crops?',
      },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Wellness',
    teluguName: 'ఆరోగ్య సమాచారం',
    badge: 'Health Guide',
    iconName: 'HeartPulse',
    description: 'Educational healthcare knowledge, physiology, symptom context, and preventive wellness (Non-diagnostic).',
    examples: [
      {
        title: 'Diabetes Pathophysiology',
        prompt: 'What is the physiological difference between Type 1 and Type 2 diabetes? Explain insulin resistance and HbA1c testing.',
      },
      {
        title: 'రక్తపోటు (Hypertension) జాగ్రత్తలు',
        prompt: 'అధిక రక్తపోటును నియంత్రించడానికి జీవనశైలి మార్పులు మరియు ఆహార నియమాలను తెలుగులో వివరంగా చెప్పండి.',
        isTelugu: true,
      },
      {
        title: 'Immune System Basics',
        prompt: 'How does adaptive immunity differ from innate immunity, and how do mRNA vaccines train memory B-cells?',
      },
    ],
  },
  {
    id: 'stem',
    name: 'STEM & Mathematics',
    teluguName: 'గణితం & సైన్స్',
    badge: 'STEM Lab',
    iconName: 'Atom',
    description: 'Calculus, linear algebra, physics derivations, chemistry reaction mechanisms, and logic.',
    examples: [
      {
        title: 'Calculus Optimization',
        prompt: 'Find the dimensions of a cylinder with volume 1000 cm³ that minimizes surface area. Show step-by-step differentiation.',
      },
      {
        title: 'Quantum Wave-Particle Duality',
        prompt: 'Explain the de Broglie wavelength concept and demonstrate the double-slit experiment derivation.',
      },
      {
        title: 'ఆర్గానిక్ కెమిస్ట్రీ రియాక్షన్స్',
        prompt: 'SN1 మరియు SN2 రియాక్షన్ల మధ్య ప్రాథమిక తేడాలను సరళంగా వివరించండి.',
        isTelugu: true,
      },
    ],
  },
  {
    id: 'career',
    name: 'Career & Interview Prep',
    teluguName: 'కెరీర్ & ఇంటర్వ్యూలు',
    badge: 'Career Coach',
    iconName: 'Briefcase',
    description: 'Mock interviews, behavioral STAR responses, resume bullet enhancements, and negotiation.',
    examples: [
      {
        title: 'System Design Interview Prep',
        prompt: 'Mock interview: How would you design a distributed URL shortening service like TinyURL for 100M active daily users?',
      },
      {
        title: 'STAR Behavioral Response',
        prompt: 'Help me craft a STAR response for: "Tell me about a time you handled a severe production outage or conflict in your team."',
      },
      {
        title: 'సాఫ్ట్‌వేర్ ఇంజనీర్ ఇంటర్వ్యూ చిట్కాలు',
        prompt: 'ఫ్రెషర్స్ కోసం టెక్నికల్ ఇంటర్వ్యూలలో విజయం సాధించడానికి ముఖ్యమైన చిట్కాలను తెలుగులో చెప్పండి.',
        isTelugu: true,
      },
    ],
  },
  {
    id: 'english_telugu',
    name: 'Telugu & English Learning',
    teluguName: 'ఇంగ్లీష్ & తెలుగు అభ్యాసం',
    badge: 'Linguistics',
    iconName: 'Languages',
    description: 'Grammar coaching, vocabulary building, translation practice, sentence correction, and idioms.',
    examples: [
      {
        title: 'Tenses Masterclass in Telugu',
        prompt: 'Explain Present Perfect Tense vs Simple Past Tense using Telugu translations and real-life everyday conversational examples.',
      },
      {
        title: 'Professional Email Writing',
        prompt: 'Convert this informal message into a polished professional workplace email: "Hey bro cannot come today got bad fever fix the bug later".',
      },
      {
        title: 'తెలుగు పద సంపద & వ్యాకరణం',
        prompt: 'సంధులు మరియు సమాసాల ప్రాథమిక సూత్రాలను కొన్ని చక్కని ఉదాహరణలతో విద్యార్థులకు అర్థమయ్యేలా వివరించండి.',
        isTelugu: true,
      },
    ],
  },
  {
    id: 'education',
    name: 'Education & Academics',
    teluguName: 'విద్యా సంబంధిత విషయాలు',
    badge: 'Academics',
    iconName: 'GraduationCap',
    description: 'Curriculum summaries, study guides, history, literature analysis, and exam strategies.',
    examples: [
      {
        title: 'Active Recall Study Plan',
        prompt: 'Create a 4-week spaced repetition and active recall study schedule for preparing for competitive exams.',
      },
      {
        title: 'World History Synthesis',
        prompt: 'Explain the geopolitical causes and consequences of the Industrial Revolution in Europe.',
      },
      {
        title: 'సైన్స్ కాన్సెప్ట్ సమ్మరీ',
        prompt: 'గురుత్వాకర్షణ శక్తి (Gravity) న్యూటన్ మరియు ఐన్‌స్టీన్ సిద్ధాంతాల ప్రకారం ఎలా భిన్నంగా అర్థం చేసుకోబడుతుందో వివరించండి.',
        isTelugu: true,
      },
    ],
  },
];
