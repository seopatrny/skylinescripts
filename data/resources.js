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
  '150-riverside': {
    year: 2017, architect: 'Goettsch Partners',
    stories: [
      'This land is squeezed between the river and the railroad tracks. It was so narrow that for over 100 years nobody thought you could build anything worthwhile on it. Goettsch Partners figured out that if a building stood on a very narrow base, you could fit a 53-story tower here.',
      'A narrow base means the building could sway in the wind. To stop that, about 160,000 gallons of water sit behind the glass near the top. When the building sways, the water sloshes back and forth a little slower than the building and calms the motion. These are called tuned sloshing dampers. The only other building in Chicago with this system is the St. Regis tower.',
    ],
  },
  '100-riverside': {
    year: 1990, architect: 'Perkins & Will',
    stories: [
      '100 North Riverside is the former Boeing headquarters. It is built right over railroad tracks, and the building pays about $1.3 million a year to lease the air space over them.',
      'The architects had a problem: the southwest corner of the shorter part of the building sat right over switch tracks, which take up a lot of room. There was no space to dig a foundation or drill supports for that corner. Look at the top of the building and you will see big trusses. That corner has no foundation at all. It hangs from the trusses at the top instead of being held up from below. Perkins & Will sometimes sends architects to measure it and make sure the corner is still where it should be and not sagging.',
    ],
  },
  '2-riverside': {
    year: 1929, architect: 'Holabird & Root',
    stories: [
      'This was the first building in Chicago built on the "air rights" over railroad tracks. It was the headquarters of the Chicago Daily News, and the printing presses were on the lower floors, so the newspaper was actually printed right here.',
      'It was also the first building designed from the start with a plaza along the river. Band concerts were held on the plaza in the 1930s, and it is still used for summer entertainment today.',
    ],
  },
  'boa-tower': { year: 2020, architect: 'Goettsch Partners', stories: [] },
  'civic-opera': {
    year: 1929, architect: 'Graham, Anderson, Probst & White',
    stories: [
      'The building looks like a giant high-backed chair or throne, so it is sometimes called "Insull\'s Throne," after Samuel Insull, the very rich Chicagoan who paid for much of it.',
      'Legend (not true!): Insull\'s girlfriend was an opera singer who flopped in New York, so he built this opera house so she would have a place to sing in Chicago, and the "throne" faces west so he could turn his back on New York and the people who did not like her. It is a fun story, but just an urban legend.',
      'What did happen: the opera house opened in 1929, right when the stock market crashed and the Great Depression began. Insull lost his fortune. A few years later he died in a Paris subway station with only 84 cents in his pocket.',
    ],
  },
  cme: {
    year: '1983 and 1987', architect: 'Fujikawa Johnson',
    stories: [
      'The low middle part of the complex was built for trading floors. Today trading is mostly done on computers, so the middle is now offices.',
      'The middle part gives the towers less support than they get on their outer sides, and the architects worried the towers might slowly tilt in toward the center. Their fix: from the 1st to the 21st floor, each floor of the towers sticks out toward the street by an extra 1/8 inch, and from the 22nd floor to the top each floor steps back toward the center. That tiny shift of weight did the trick. The towers don\'t tilt.',
    ],
  },
  willis: {
    year: 1973, architect: 'Skidmore, Owings & Merrill',
    stories: [
      'This building was first called the Sears Tower. The Willis insurance company bought the naming rights, so now it is the Willis Tower. It is the tallest building in Chicago and was the tallest in the world for about 25 years. Today more than 20 buildings around the world are taller.',
      'The building is really nine separate square towers, arranged 3 by 3. Each is 75 feet by 75 feet, and they stop at different heights. This is called "bundled tube" construction: each tube supports its neighbors, which makes the building extremely strong. It was invented by Skidmore, Owings & Merrill\'s structural engineer, Fazlur Rahman Khan.',
      'It has almost as many elevators as floors: 110 floors and about 100 elevators. Robot machines wash the windows so human window washers don\'t have to go up all 110 stories.',
    ],
  },
  '311-wacker': {
    year: 1990, architect: 'Kohn Pedersen Fox',
    stories: [
      'If your new building is right across the street from one of the tallest, most famous buildings in the world, how do you get it noticed? Look at the big round crown on top. Every night it is lit by about 1,400 fluorescent bulbs. Anywhere you can see it at night, it is the first building you notice, and then you see the Willis Tower right across the street.',
      'The crown used to be even brighter, with more bulbs, but migrating birds kept flying into it, so the lights were turned down.',
    ],
  },
  '300-wacker': {
    year: 1971, architect: '',
    stories: [
      'Look at the river side of this building: there is a giant mural that is a map of the Chicago River. The red rectangle at the top stands for the building itself, so the tour guide calls it the "you are here" part of the map.',
    ],
  },
  'post-office': {
    year: '1921, expanded 1932', architect: 'Graham, Anderson, Probst & White',
    stories: [
      'When it was built, the Old Post Office was the largest post office in the world. Chicago needed it: the city was home to Montgomery Ward, Sears, Spiegel and Butler Brothers, all huge mail-order companies sending tons of packages every day.',
      'It also has an expressway running right through the middle of it.',
      'By the 1990s it was out of date as a post office, so the Post Office moved to a new building across the street. The old building sat empty for years. Today it may be the biggest and best example of "adaptive reuse" in Chicago: it is a beautiful, very successful office building.',
      'As the tour guide tells it (we could not confirm every detail): the government auctioned the empty building, with a first bid of only $300,000. A British developer bought it for about $20 million but did nothing with it, until the city threatened to take it away. It was resold years later for a huge profit, and the story goes that the seller died soon after with no one to leave the money to. Who got all that money?',
    ],
  },
  'river-city': {
    year: 1986, architect: 'Bertrand Goldberg',
    stories: [
      'River City was designed by the same architect as Marina City, Bertrand Goldberg. His rule: "There are no right angles in nature, so there should be no right angles in architecture."',
      'It was meant to be a village of three S-shaped buildings, but the city thought that many apartments would crowd the area, so only one was built. Today a very large development is going up just south of River City, so crowding isn\'t a worry anymore.',
      'In 1986 this area was all industrial and almost nobody came here, so many people thought it was a mistake to build here. Today the South Loop is one of the most popular neighborhoods in Chicago.',
    ],
  },
  'ohio-bridge-house': {
    year: 1914, architect: '',
    stories: [
      'This tender house actually belongs to the Grand Avenue bridge. It and the Kinzie Street bridge just south of it are the only two single-leaf, fixed-trunnion bridges left in Chicago. The bridges on the North Branch don\'t go up and down anymore; they are fixed in place.',
      'The bridge tender worked in this little house every day. When a ship came down the river, the tender used the controls inside to stop traffic and raise the bridge so the ship could pass.',
      'Unlike the fancy stone tender houses on other bridges, this one is plain green wooden clapboard. It was restored in 1990 to show what the old tender houses really looked like: very basic.',
    ],
  },
  'power-house': {
    year: 1932, architect: 'Graham, Anderson, Probst & White',
    stories: [
      'You will notice this building is in pretty bad shape. It is the old power house for Union Station, about half a mile north.',
      'In the old days many downtown buildings were not connected to a central power grid. They made their own electricity with generators in their basements. This power plant made the electricity for Union Station and the old Main Post Office. It is shut down now, but it was still supplying power as recently as the 1990s.',
    ],
  },
  bmo: {
    year: 2022, architect: 'Goettsch Partners',
    stories: [
      'Look for the big V-shaped supports on the river side of the building. They look a lot like the V shape at the base of 150 North Riverside, just up the river. That is probably not a coincidence: both buildings were designed by the same firm, Goettsch Partners.',
    ],
  },
  'mcdonalds-park': {
    year: 'Opening planned for 2028', architect: 'Gensler',
    stories: [
      'This is the site of the new stadium for the Chicago Fire, Chicago\'s professional soccer team. It is being built on a large piece of empty land called "The 78."',
      'A few years ago Amazon looked at this land as a possible site for its second headquarters, but it chose other cities instead. The plan now is to fill the area with apartments and places to have fun.',
      'Why "78"? Chicago is officially divided into 77 community areas. The developer wants this to become the 78th.',
    ],
  },
  'amtrak-bridge': {
    year: '1915', architect: '',
    stories: [
      'This vertical lift bridge is one of the oldest bridges on the river and the tallest, and after more than 110 years it looks it. Amtrak trains still use it every day.',
      'In 2026 it was announced that the bridge will be renovated next year to bring it up to 21st-century standards. (The tour guide offered to share more about how it was built.)',
    ],
  },
  riverwalk: {
    year: '2009–2016', architect: 'Sasaki, Ross Barney Architects, and Jacobs/Ryan Associates',
    stories: [
      'The Riverwalk runs along the south side of the Main Branch. You can walk from where the river branches all the way to the lake without climbing up to the street to cross: the path goes under each bridge.',
      'Chicago needed special permission from Congress to build it, because the walkways make the river a little narrower and the river is a federally controlled waterway.',
      'Each block between bridges has its own theme, such as Marina Plaza, the Cove, the River Theater, the Jetty and the Boardwalk. There are places to eat, sit, enjoy the view, and even fish. The Main Branch now has about 70 kinds of fish.',
    ],
  },
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
