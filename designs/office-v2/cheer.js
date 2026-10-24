// Agiza Office: the words that lift the mood. Edit freely: plain text, one line per item.
// Used by assistant.js for the mood card, the helper's replies and celebrations.
window.AGIZA_CHEER = {

  // One is picked per day for each part of the day (and "Another" shows the next).
  encourage: {
    morning: [
      'Every family you meet today is a family you could help protect. That is meaningful work.',
      'Start with the call you are most tempted to postpone. The rest of the day gets lighter.',
      'You do not need a perfect day, just a few good conversations.',
      'Habari ya asubuhi! A fresh day, a fresh chance to make someone feel looked after.',
      'Small steps count: one follow-up, one new contact, one kind message.',
      'Your calm confidence is part of what clients buy. Bring it with you today.',
      'Plan the day, then trust yourself to handle the surprises.',
      'Someone out there is hoping for exactly the advice you give. Go find them.'
    ],
    afternoon: [
      'Halfway through. Drink some water, stretch, and keep going strong.',
      'A quick check-in message now can turn into a signed form next week.',
      'If the morning was slow, the afternoon can still surprise you.',
      'Take a breath between meetings. You listen better when you are not rushing.',
      'Progress, not perfection. Every conversation teaches you something.',
      'One more follow-up before tea? Future you will be grateful.',
      'You are building trust one conversation at a time. That compounds.'
    ],
    evening: [
      'Well done today. Rest is part of the work, so let yourself switch off.',
      'Write down one win from today, however small. It adds up.',
      'Tomorrow is ready for you. Tonight is for you and your people.',
      'Whatever did not get done can wait until morning. You did enough.',
      'Usiku mwema. Recharge, and come back tomorrow with fresh energy.',
      'Every policy you place is a promise kept for a family. Be proud of that.'
    ]
  },

  // Shown in the "Did you know?" corner. Kept factual; tips are labelled as tips.
  facts: [
    'Lloyd\'s of London grew out of Edward Lloyd\'s coffee house, where ship owners and underwriters met in the late 1600s.',
    'Prudential was founded in London in 1848. Its Africa business entered Kenya in 2014.',
    'Insurance in Kenya is supervised by the Insurance Regulatory Authority (IRA), set up in 2006.',
    'The word "premium" comes from the Latin "praemium", meaning a reward or prize.',
    'Kenya spends less than 3% of its GDP on insurance, so most families are still uncovered. That is a lot of people you can help.',
    'Ancient Babylon\'s Code of Hammurabi had an early form of insurance: a merchant\'s loan could be forgiven if the goods were lost.',
    'Long ago, Chinese river traders spread their goods across many boats, so one sinking never ruined a single trader. That is risk-sharing.',
    'A chama works on the same idea as insurance: many people pool a little so that no one faces a big loss alone.',
    'After the Great Fire of London in 1666, the first fire insurance offices were set up in the city.',
    'Life cover is priced using life-expectancy statistics, which is why starting young usually means lower premiums.',
    'M-Pesa launched in Kenya in 2007. Paying small amounts by phone made it easier for many people to afford cover.',
    'Psychologists call it "loss aversion": a loss feels roughly twice as strong as an equal gain. "Protect what you have built" often lands better than "gain".',
    'The "foot-in-the-door" effect: people who agree to a small request, like a 10-minute chat, are more likely to agree to a bigger one later.',
    'Reciprocity is powerful: give something useful first, like a simple budgeting tip, and people are happier to give you their time.',
    'Social proof: people follow people like them. A true story (with permission) from a client in the same job or church persuades more than any brochure.',
    'Sales tip: many deals close after several polite follow-ups, yet most people stop after one or two.',
    'Sales tip: open questions such as "What matters most for your children\'s future?" get clients talking, and people trust those who listen.',
    'Sales tip: the best time to ask for a referral is right after a client is covered, when they feel best about their decision.',
    'Marketing tip: WhatsApp Status works like a free billboard for everyone who saved your number. Share helpful tips, not only adverts.',
    'Old marketing wisdom says people need to see a message several times before acting. Consistency beats one big post.',
    'Marketing tip: posts showing a real face, yours, usually get more attention than plain text graphics.',
    'Marketing tip: a 30-second "insurance myth vs fact" video is easy to watch on a phone and easy to share.',
    'People remember stories far better than numbers. Lead with a story, then give the figure.'
  ],

  // Ready-made WhatsApp messages from the Home "Needs you" list. She sees and can edit them in WhatsApp before sending.
  whatsapp: {
    followup: 'Hi {name}, it\'s Agiza from Prudential. Just checking in on the quote I sent you. Happy to answer any questions.',
    hello: 'Hi {name}, it\'s Agiza from Prudential. Lovely to connect! When would be a good time for a quick chat?',
    docs: 'Hi {name}, it\'s Agiza. A gentle reminder about the documents for your application. Thank you!'
  },

  // Celebrations. {n} is replaced with a number where it makes sense.
  celebrate: {
    covered: [
      '🎉 Hongera! Another family protected. That is {n} this month!',
      '🎉 Covered! {n} families protected this month. Keep that momentum.',
      '🎉 Beautiful work. {n} this month, and each one is a promise kept.'
    ],
    accepted: [
      '🥳 Quote accepted! Your follow-ups paid off.',
      '🥳 A yes! Well done, Agiza.',
      '🥳 Accepted! Time for the paperwork victory lap.'
    ],
    cleared: [
      '✨ Every to-do done. Clean slate. Well done!',
      '✨ Nothing left on the list. Enjoy that feeling.',
      '✨ All clear! You earned a proper break.'
    ],
    added: [
      'Done ✅',
      'Saved ✅ One less thing to remember.',
      'Got it ✅'
    ]
  }
};
