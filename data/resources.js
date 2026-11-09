// Research resources per stop: year, architect and longer stories, from the
// "90 Minute River Tour Buildings" sheet shared by a volunteer river tour guide
// (Nov 2026). Spelling was tidied and a few clear slips fixed (dates, names);
// the stories are otherwise in the guide's own words. Some are legends and are
// labeled that way. Students should still double-check facts they use.

const SOURCE = 'Volunteer river tour guide';

const byStop = {
  wrigley: {
    year: '1921–1924', architect: 'Graham, Anderson, Probst & White',
    stories: [
      'The Wrigley family first sold laundry soap, then baking powder. To get people to buy the baking powder, they gave away packs of chewing gum with it. Everyone liked the gum better than the baking powder, so they switched their whole business to chewing gum. In 1915 William Wrigley Jr. mailed a stick of gum to every address in the phone books of the United States.',
      'The Wrigley Building was the first skyscraper north of the river. Back then Michigan Avenue ended at the river; north of the river the street was called Pine Street.',
      'The building is covered with six different shades of white terra cotta. It was the first building in Chicago to have air conditioning. The Wrigley company itself is now located on Goose Island.',
    ],
  },
  tribune: {
    year: 1925, architect: 'Raymond Hood and John Mead Howells',
    stories: [
      'This building came from a contest. In 1922 Robert McCormick, head of the Chicago Tribune, offered $100,000 in prizes for the design of "the most beautiful office building in the world." The winners were Raymond Hood and John Mead Howells. The top was inspired by the Gothic "Butter Tower" of Rouen Cathedral in France.',
      'Around the base you can see stones from famous places all over the world: the Great Wall of China, the Parthenon in Greece, the Berlin Wall, the Great Pyramid of Egypt, St. Peter\'s Basilica and the World Trade Center. They are all labeled, and you can spend an hour finding and touching them.',
      'Robert McCormick was related to Cyrus McCormick, who invented the mechanical reaper that changed farming. That company later became International Harvester.',
    ],
  },
  trump: {
    year: 2009, architect: 'Skidmore, Owings & Merrill (Adrian Smith)',
    stories: [
      'Trump International Hotel & Tower is the second tallest building in Chicago. It was designed by a Chicago architect named Adrian Smith. Adrian Smith also designed the tallest building in the world, the Burj Khalifa in Dubai, which is about twice as tall. He also designed Jeddah Tower in Saudi Arabia, under construction now, which will be about two and a half times as tall as Trump Tower. All three were designed right here in Chicago, about a mile from your school.',
    ],
  },
  ama: {
    year: 1973, architect: 'Ludwig Mies van der Rohe',
    stories: [
      'This is the last major building designed by Mies van der Rohe. He never saw it finished: he died in 1969 and the building was completed a few years later. Today it holds the American Medical Association and the Langham Hotel, one of the few hotels in Chicago that serves formal afternoon tea.',
      'Mies taught architecture in Germany, came to the United States in the 1930s, and became head of the architecture school at IIT in Chicago. His style is called the International Style. He believed modern buildings should show the modern materials they are made of, without clutter or decoration: "less is more." That is why his buildings are usually dark glass and steel with no ornament.',
    ],
  },
  marina: {
    year: '1959–1964', architect: 'Bertrand Goldberg',
    stories: [
      'Bertrand Goldberg was a young Chicago student who went to Germany to study at the Bauhaus, where Mies van der Rohe taught. But his ideas went the other way from Mies: Goldberg said there are no right angles in nature, so there should be none in architecture. His buildings are round and curvy instead of boxy.',
      'When the towers were finished in 1964, almost nobody lived downtown. Living in the Loop was a brand-new idea. Today there are thousands of apartments and condos downtown, and this is the building that started it all.',
    ],
  },
  'reid-murdoch': {
    year: 1914, architect: 'George C. Nimmons',
    stories: [
      'This was built as a warehouse for the Monarch Foods company (Reid, Murdoch & Co.). Today it is an office building. Architects call that "adaptive reuse": taking an industrial building and redesigning it for a new use.',
      'Count the bays of windows on each side of the clock tower: the left side has fewer than the right. In the 1920s the city widened LaSalle Street and the building was in the way. Instead of tearing the whole thing down, they removed one section and rebuilt the end, so now the building is lopsided.',
      'In the early 1900s a watch was a luxury and many people did not have one. The big clock let people on the river and the street see whether they were late for work.',
    ],
  },
  '300-lasalle': { year: 2009, architect: 'Pickard Chilton', stories: [] },
  themart: {
    year: 1930, architect: 'Graham, Anderson, Probst & White',
    stories: [
      'When the Merchandise Mart was built it was the largest building in the world, with about 4 million square feet of floor space. It started as a wholesale warehouse for the Marshall Field company.',
      'In front of the building are bronze heads of important Chicago merchants on tall columns. Chicagoans call them the "Pez Heads" because they look like Pez candy dispensers.',
    ],
  },
  'wolf-point': {
    year: '2009–2023', architect: 'Pelli Clarke & Partners; bKL Architecture',
    stories: [
      'Wolf Point East and West are apartment buildings, and Wolf Point South (Salesforce Tower) is an office building.',
      'Wolf Point is where Chicago began. The first settlers lived here, where the main branch of the river splits into the North and South Branches. There were wolves here back then, which is how it got its name.',
      'This is also where Chicago got its name. Settlers heard the Native Americans call the area "shikaakwa," which over the years became "Chicago." Shikaakwa means wild onion, or "smelly onion." The riverbanks were covered with wild onions and wild garlic, which smelled strong in the summer.',
    ],
  },
  salesforce: { year: 2023, architect: 'Pelli Clarke & Partners', stories: ['See Wolf Point Towers: Salesforce Tower is Wolf Point South, the office tower of the three, and it stands where Chicago began and got its name.'] },
  'fulton-house': {
    year: '1908 (converted 1981)', architect: 'Frank Abbott; conversion by Harry Weese',
    stories: [
      'This building started as a cold storage warehouse for dairy foods like butter, milk and eggs. In the early 1980s architect Harry Weese turned it into condominiums.',
      'Because it was built to stay cold, some walls were 3 feet thick and insulated with cork and horse hair. It took five months for the building to thaw out, and workers hauled away about 500 truckloads of horse hair and cork to make it into homes.',
    ],
  },
  'montgomery-ward': {
    year: 1908, architect: 'Schmidt, Garden & Martin',
    stories: [
      'Today the Montgomery Ward Catalog House is called The Domain. Montgomery Ward printed a catalog almost 2 inches thick. It was a bit like Amazon: socks, a bike, a vacuum cleaner, almost anything you wanted was in that catalog, and it was all stored in this building.',
      'The building is so long that workers filling an order at one end might need something from the far end. To speed things up, the order pickers wore roller skates and skated up and down the aisles.',
      'This is also where Rudolph the Red-Nosed Reindeer was created: Montgomery Ward copywriter Robert L. May wrote the story in 1939 as a free holiday booklet for shoppers. (The guide offered to share the whole story with anyone who wants to tell it.)',
    ],
  },
  'river-point': { year: 2017, architect: 'Pickard Chilton', stories: [] },
  '150-riverside': { year: 2017, architect: 'Goettsch Partners', stories: [] },
  '100-riverside': { year: 1990, architect: 'Perkins & Will', stories: [] },
  'boa-tower': { year: 2020, architect: 'Goettsch Partners', stories: [] },
  'civic-opera': {
    year: 1929, architect: 'Graham, Anderson, Probst & White',
    stories: [
      'The building looks like a giant high-backed chair or throne, so it is sometimes called "Insull\'s Throne," after Samuel Insull, the very rich Chicagoan who paid for much of it.',
      'Legend (not true!): Insull\'s girlfriend was an opera singer who flopped in New York, so he built this opera house so she would have a place to sing in Chicago, and the "throne" faces west so he could turn his back on New York and the people who did not like her. It is a fun story, but just an urban legend.',
      'What did happen: the opera house opened in 1929, right when the stock market crashed and the Great Depression began. Insull lost his fortune. A few years later he died in a Paris subway station with only 84 cents in his pocket.',
    ],
  },
  cme: { year: '1983 and 1987', architect: 'Fujikawa Johnson', stories: [] },
  willis: { year: 1973, architect: 'Skidmore, Owings & Merrill', stories: [] },
  '311-wacker': { year: 1990, architect: 'Kohn Pedersen Fox', stories: [] },
  'post-office': { year: '1921, expanded 1932', architect: 'Graham, Anderson, Probst & White', stories: [] },
  'river-city': { year: 1986, architect: 'Bertrand Goldberg', stories: ['Same architect as Marina City, and the same rule: no right angles. See the Marina City story.'] },
  '333-wacker': {
    year: 1983, architect: 'Kohn Pedersen Fox',
    stories: [
      'An example of "contextualism": the building responds to its site. Its glass wall curves exactly where the river curves. It is often voted the most beautiful building on the Chicago River.',
      'In the 1986 movie "Ferris Bueller\'s Day Off," Ferris rides a float in a downtown parade singing "Danke Schoen" and "Twist and Shout," and his father watches from his office in this building. But the parade was really filmed about half a mile south, so nobody could have seen it from these windows. The magic of moviemaking!',
    ],
  },
  carbide: {
    year: 1929, architect: 'Burnham Brothers',
    stories: [
      'This building was designed by two of Daniel Burnham\'s sons, the Burnham Brothers. The story goes that during Prohibition (when alcohol was illegal) they were at a New Year\'s Eve party, saw a bottle of champagne, and decided to protest Prohibition by designing a building that looks like one.',
      'It is covered in dark green terra cotta and topped with gold leaf, just like a champagne bottle with its foil. It started as an office building and is now a luxury hotel, the Pendry.',
    ],
  },
  'london-house': {
    year: 1923, architect: 'Alfred S. Alschuler',
    stories: [
      'This was built as an office building and headquarters for the London Guarantee & Accident insurance company, and about a decade ago it became a luxury hotel. In the 1950s and 1960s a famous jazz club called the London House was on the first floor, so the hotel took that name.',
      'The little structure on the top that looks like a tiny Greek temple is called a cupola, or tempietto. If you want to propose to someone up there, there is even a kneeler. The hotel gives you a big bottle of champagne to celebrate. It costs about $3,000, so be sure of the answer first: if they say "let\'s just stay friends," you just bought a $3,000 bottle of champagne.',
    ],
  },
  aqua: {
    year: 2009, architect: 'Jeanne Gang (Studio Gang)',
    stories: [
      'This used to be the tallest building in the world designed by a woman, Jeanne Gang. Now the record belongs to the St. Regis tower, also by Jeanne Gang.',
      'The wavy balconies make the building look like flowing water. When it was finished it won an award as the most beautiful residential skyscraper in the world.',
    ],
  },
  'st-regis': {
    year: 2020, architect: 'Jeanne Gang (Studio Gang)',
    stories: [
      'This is the third tallest building in Chicago and the tallest in the world designed by a woman, Jeanne Gang.',
      'On the tallest tower there is a gap in the floors near the top called a "blow-through." Nothing is there except the elevator shafts. Wind blows right through so the tower doesn\'t sway as much.',
      'Behind the glass at the top are about 400,000 gallons of water (about 1,600 tons). If the building sways, the water sloshes back and forth a little behind it and calms the motion. These are called tuned sloshing dampers. Nobody wants to get seasick in a condo that cost millions of dollars!',
      'There are five different shades of blue glass, and the glass was specially made so migrating birds don\'t fly into the building.',
    ],
  },
  nbc: {
    year: 1989, architect: 'Skidmore, Owings & Merrill (Adrian Smith)',
    stories: [
      'This is NBC\'s Chicago headquarters. NBC\'s New York home is 30 Rockefeller Plaza, and they wanted the Chicago building to remind people of it. It isn\'t a copy, but it was designed to look like a relative of "30 Rock." The architect was Adrian Smith, who later designed the Burj Khalifa in Dubai, the tallest building in the world.',
    ],
  },
  'lake-point': {
    year: 1968, architect: 'George Schipporeit and John Heinrich',
    stories: [
      'Two of Mies van der Rohe\'s students, George Schipporeit and John Heinrich, started from a design Mies made in 1922 for a glass skyscraper in Berlin that was never built. They changed it: three curved wings instead of four, and 70 stories tall. Until the 1990s it was the tallest apartment building in the world.',
      'It is the only private building east of Lake Shore Drive. Chicago has a rule against private buildings on the lakefront, but this land had been privately owned since the 1800s, so it was "grandfathered in." (Some tellers say a young lawyer named Abraham Lincoln helped with an early sale of the land.)',
      'Because of its shape, every apartment has a view of Lake Michigan. For years people thought Oprah Winfrey lived here, but she never did. Celebrities who did have homes here include Goldie Hawn and Kurt Russell, Scottie Pippen, Dennis Rodman and rock star Alice Cooper.',
    ],
  },
};

module.exports = { byStop, SOURCE };
