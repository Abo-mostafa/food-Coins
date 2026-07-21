HUD (CanvasLayer)
├── TopBar (MarginContainer)  <-- بيحافظ على مسافة من حواف الشاشة
│   └── TopHBox (HBoxContainer)
│       ├── HealthSection (HBoxContainer)
│       │   ├── HeartIcon (TextureRect)
│       │   └── HealthBar (ProgressBar)  <-- أو Label
│       │
│       ├── LevelInfo (VBoxContainer)
│       │   ├── LevelNameLabel (Label)  <-- اسم المستوى
│       │   └── TimerLabel (Label)      <-- التايمر
│       │
│       └── StatsSection (HBoxContainer)
│           ├── ScoreLabel (Label)      <-- السكور
│           ├── EnemyLabel (Label)      <-- عدد الوحوش
│           └── BombLabel (Label)       <-- القنابل النشطة المتاحة
│
└── LevelTimer (Timer)                  <-- تايمر المستوى