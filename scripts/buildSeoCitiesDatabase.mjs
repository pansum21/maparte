import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comprehensive dictionary for all 81 popular world cities
const CITY_DATABASE = {
  "New York": {
    country: "United States", continent: "North America", lat: 40.7128, lon: -74.0060, distance: 15000,
    tagline: "The Iconic Manhattan Grid & Hudson River Estuary",
    landmarks: ["Manhattan Grid", "Central Park", "Brooklyn Bridge", "Hudson River", "Times Square", "SoHo"],
    description: "Transform New York City into museum-quality wall art. Featuring Manhattan's legendary 1811 Commissioners' street grid, the rectangular oasis of Central Park, the Brooklyn waterfront, and Staten Island ferry routes in ultra-high resolution (up to 500 PPI Ultra-HD)."
  },
  "Paris": {
    country: "France", continent: "Europe", lat: 48.8566, lon: 2.3522, distance: 12000,
    tagline: "The City of Light, Haussmann Boulevards & Seine Meanders",
    landmarks: ["Eiffel Tower", "Seine River", "Champs-Élysées", "Louvre Museum", "Montmartre", "Notre-Dame"],
    description: "Design bespoke minimalist map posters of Paris, France. Featuring Baron Haussmann's grand radiating avenues, the winding banks of the River Seine, Île de la Cité, and the romantic hill of Montmartre in crystal-sharp vector detail."
  },
  "London": {
    country: "United Kingdom", continent: "Europe", lat: 51.5074, lon: -0.1278, distance: 14000,
    tagline: "Historic Metropolis on the River Thames",
    landmarks: ["River Thames", "Tower Bridge", "Big Ben", "Hyde Park", "Soho", "Canary Wharf"],
    description: "Craft stunning custom city map posters of London, United Kingdom. Highlight the dramatic bends of the River Thames, iconic Royal Parks, the City financial district, and historic Westminster street grids."
  },
  "Tokyo": {
    country: "Japan", continent: "Asia", lat: 35.6762, lon: 139.6503, distance: 18000,
    tagline: "World's Greatest Megacity of Neon & Ancient Harmony",
    landmarks: ["Tokyo Bay", "Shinjuku", "Shibuya Crossing", "Imperial Palace Gardens", "Sumida River", "Ginza"],
    description: "Immortalize Tokyo, Japan with bespoke custom map art. From the labyrinthine rail networks and Tokyo Bay islands to the lush moats of the Imperial Palace and vibrant Shibuya crossing."
  },
  "Rome": {
    country: "Italy", continent: "Europe", lat: 41.9028, lon: 12.4964, distance: 11000,
    tagline: "The Eternal City of Seven Hills & Tiber River Bridges",
    landmarks: ["Colosseum", "Tiber River", "Vatican City", "Trastevere", "Pantheon", "Villa Borghese"],
    description: "Celebrate your romantic trip to Rome, Italy with a custom framed map poster. Trace the meandering curves of the River Tiber, ancient cobblestone alleys of Trastevere, and classical imperial plazas in ultra-high resolution (up to 500 PPI)."
  },
  "Mumbai": {
    country: "India", continent: "Asia", lat: 18.9220, lon: 72.8347, distance: 14000,
    tagline: "The City of Dreams & Coastal Marine Drive",
    landmarks: ["Marine Drive", "Gateway of India", "Bandra-Worli Sea Link", "Colaba", "Juhu Beach", "CSMT Terminus"],
    description: "Design museum-grade custom map posters of Mumbai (Bombay), India. Featuring the iconic crescent curve of Marine Drive (Queen's Necklace), the Bandra-Worli Sea Link over the Arabian Sea, and the colonial heritage grid of South Bombay in ultra-high resolution (up to 500 PPI Ultra-HD)."
  },
  "Delhi": {
    country: "India", continent: "Asia", lat: 28.6139, lon: 77.2090, distance: 16000,
    tagline: "Historic Capital of India & Lutyens' Architectural Grandeur",
    landmarks: ["India Gate", "Red Fort", "Connaught Place", "Humayun's Tomb", "Lotus Temple", "Qutub Minar"],
    description: "Create print-ready custom map posters of Delhi, India. Capture the circular radial symmetry of Connaught Place, the ceremonial boulevards of Lutyens' Delhi, and the winding alleys of Old Delhi along the Yamuna River."
  },
  "Goa": {
    country: "India", continent: "Asia", lat: 15.4989, lon: 73.8278, distance: 22000,
    tagline: "Tropical Sunsets, Arabian Coastline & Bohemian Serenity",
    landmarks: ["Panaji Waterfront", "Mandovi River", "Candolim Beach", "Calangute", "Old Goa Heritage Churches"],
    description: "Celebrate your tropical vacation or destination wedding with a high-definition map art print of Goa, India. Featuring pristine coastline estuaries, coconut groves, and charming Portuguese-colonial riverside streets."
  },
  "Austin": {
    country: "United States", continent: "North America", lat: 30.2672, lon: -97.7431, distance: 12000,
    tagline: "Live Music Capital on Lady Bird Lake",
    landmarks: ["Lady Bird Lake", "Colorado River", "South Congress (SoCo)", "Texas Capitol", "Zilker Park"],
    description: "Celebrate your memories in Austin, Texas. Featuring Lady Bird Lake, Zilker Park, vibrant South Congress avenues, and the historic Texas State Capitol."
  },
  "Venice": {
    country: "Italy", continent: "Europe", lat: 45.4408, lon: 12.3155, distance: 6000,
    tagline: "The Floating City of 118 Lagoon Islands & Grand Canal S-Curve",
    landmarks: ["Grand Canal (Canal Grande)", "Piazza San Marco", "Rialto Bridge", "Murano", "Giudecca Island"],
    description: "Venice, Italy is one of the world's most romantic cartographic masterpieces. The reverse-S curve of the Grand Canal, pedestrian bridges, and labyrinth of waterways look breathtaking when framed on archival paper."
  },
  "Boston": {
    country: "United States", continent: "North America", lat: 42.3601, lon: -71.0589, distance: 11000,
    tagline: "America's Historic Cradle of Liberty & Charles River Basin",
    landmarks: ["Charles River", "Boston Harbor", "Beacon Hill", "Back Bay", "Harvard Square", "Boston Common"],
    description: "Frame Boston and Cambridge, Massachusetts. Featuring the winding Charles River basin, historic gaslit Beacon Hill brick avenues, and Boston Harbor islands."
  },
  "Chicago": {
    country: "United States", continent: "North America", lat: 41.8781, lon: -87.6298, distance: 14000,
    tagline: "The Windy City's Lakefront Horizon & Chicago River Grid",
    landmarks: ["Lake Michigan Coastline", "Chicago River", "The Loop", "Millennium Park", "Lincoln Park", "Navy Pier"],
    description: "Frame Chicago, Illinois in ultra-high resolution (up to 500 PPI Ultra-HD). Trace the expansive blue waterfront of Lake Michigan, the engineering marvel of the Chicago River, and the iconic orthogonal Loop street grid."
  },
  "San Francisco": {
    country: "United States", continent: "North America", lat: 37.7749, lon: -122.4194, distance: 13000,
    tagline: "Peninsula of Iconic Hills, Bridges & Golden Gate Bay",
    landmarks: ["Golden Gate Bridge", "San Francisco Bay", "Alcatraz", "Market Street", "Mission District", "Pacific Heights"],
    description: "Design a high-resolution map poster of San Francisco, California. Showcasing the rugged peninsula topography, Golden Gate strait, Bay Bridge span, and dramatic grid hills."
  },
  "Los Angeles": {
    country: "United States", continent: "North America", lat: 34.0522, lon: -118.2437, distance: 24000,
    tagline: "Sprawling City of Angels, Pacific Coast & Palm-Lined Boulevards",
    landmarks: ["Downtown LA", "Santa Monica Pier", "Hollywood Hills", "Sunset Boulevard", "Venice Beach", "Griffith Park"],
    description: "Create custom map artwork of Los Angeles, California. From the Santa Monica coastline and Venice canals to the dramatic ridges of the Hollywood Hills and Downtown LA skyscrapers."
  },
  "Miami": {
    country: "United States", continent: "North America", lat: 25.7617, lon: -80.1918, distance: 14000,
    tagline: "Tropical Coastal Paradise & Biscayne Bay Causeways",
    landmarks: ["Biscayne Bay", "Miami Beach", "Brickell", "South Beach (SoBe)", "Wynwood", "Key Biscayne"],
    description: "Design vibrant coastal wall art of Miami, Florida. Trace the barrier islands of Miami Beach, turquoise waterways of Biscayne Bay, and the sleek modern streets of Brickell and Wynwood."
  },
  "Seattle": {
    country: "United States", continent: "North America", lat: 47.6062, lon: -122.3321, distance: 13000,
    tagline: "Emerald City Flanked by Puget Sound & Lake Washington",
    landmarks: ["Puget Sound", "Lake Washington", "Space Needle", "Pike Place Market", "Elliott Bay"],
    description: "Render Seattle, Washington in ultra-crisp cartography. Defined by the salt waters of Puget Sound, fresh waters of Lake Washington, and scenic hillside streets."
  },
  "Dallas": {
    country: "United States", continent: "North America", lat: 32.7767, lon: -96.7970, distance: 16000,
    tagline: "North Texas Modern Metropolis on the Trinity River",
    landmarks: ["Downtown Dallas", "Trinity River", "Deep Ellum", "Uptown", "White Rock Lake", "Klyde Warren Park"],
    description: "Showcase Dallas, Texas in architectural precision. Highlighting the Trinity River greenways, Deep Ellum arts district, and gleaming downtown skyline grid."
  },
  "Houston": {
    country: "United States", continent: "North America", lat: 29.7604, lon: -95.3698, distance: 18000,
    tagline: "Space City & Buffalo Bayou Urban Waterways",
    landmarks: ["Buffalo Bayou", "Downtown Houston", "Museum District", "The Heights", "Memorial Park"],
    description: "Design minimalist prints of Houston, Texas. Featuring Buffalo Bayou trails, the Museum District, and the sprawling interstate beltway networks."
  },
  "Denver": {
    country: "United States", continent: "North America", lat: 39.7392, lon: -104.9903, distance: 14000,
    tagline: "The Mile High City at the Foot of the Rocky Mountains",
    landmarks: ["South Platte River", "LoDo Historic District", "City Park", "Cheesman Park", "Capitol Hill"],
    description: "Celebrate Denver, Colorado with custom wall cartography. Tracing the South Platte River corridor, LoDo brick warehouses, and tree-lined Capitol Hill avenues."
  },
  "Phoenix": {
    country: "United States", continent: "North America", lat: 33.4484, lon: -112.0740, distance: 20000,
    tagline: "Valley of the Sun & Sonoran Desert Mountain Preserves",
    landmarks: ["Camelback Mountain", "Downtown Phoenix", "Roosevelt Row", "South Mountain Park", "Papago Park"],
    description: "Design custom wall prints of Phoenix, Arizona. Highlighting the orthogonal desert valley grid framed by iconic desert mountain peaks."
  },
  "San Diego": {
    country: "United States", continent: "North America", lat: 32.7157, lon: -117.1611, distance: 15000,
    tagline: "Sun-Soaked Pacific Coast & Natural San Diego Bay",
    landmarks: ["San Diego Bay", "Coronado Island", "Balboa Park", "Gaslamp Quarter", "La Jolla Cove"],
    description: "Frame coastal beauty with a custom map poster of San Diego, California. Featuring Coronado peninsula, sheltered natural bay harbors, and Balboa Park gardens."
  },
  "Las Vegas": {
    country: "United States", continent: "North America", lat: 36.1699, lon: -115.1398, distance: 16000,
    tagline: "The Entertainment Capital in the Mojave Desert Basin",
    landmarks: ["Las Vegas Boulevard (The Strip)", "Fremont Street", "Red Rock Canyon", "Downtown Arts District"],
    description: "Capture the glowing urban oasis of Las Vegas, Nevada. Featuring the world-famous Strip boulevard, Fremont vintage neon grid, and surrounding Mojave ridges."
  },
  "Portland": {
    country: "United States", continent: "North America", lat: 45.5152, lon: -122.6784, distance: 12000,
    tagline: "The City of Bridges on the Willamette River",
    landmarks: ["Willamette River", "Hawthorne Bridge", "Forest Park", "Pearl District", "Washington Park"],
    description: "Design an artisan map print of Portland, Oregon. Defined by twelve historic bridges over the Willamette River, expansive Forest Park wilderness, and compact downtown blocks."
  },
  "Nashville": {
    country: "United States", continent: "North America", lat: 36.1627, lon: -86.7816, distance: 13000,
    tagline: "Music City on the Horseshoe Bend of the Cumberland River",
    landmarks: ["Cumberland River", "Broadway (Honky Tonk Highway)", "The Gulch", "Centennial Park", "Music Row"],
    description: "Celebrate Nashville, Tennessee with custom wall decor. Showcasing the horseshoe bends of the Cumberland River, historic Broadway, and vibrant neighborhood corridors."
  },
  "Atlanta": {
    country: "United States", continent: "North America", lat: 33.7490, lon: -84.3880, distance: 16000,
    tagline: "The City in a Forest & Piedmont Park Greenways",
    landmarks: ["Piedmont Park", "Midtown Atlanta", "The BeltLine", "Downtown", "Inman Park", "Centennial Olympic Park"],
    description: "Showcase Atlanta, Georgia in high-definition cartography. Trace the circular loop of the Atlanta BeltLine, verdant canopy forests, and Midtown skyscrapers."
  },
  "Philadelphia": {
    country: "United States", continent: "North America", lat: 39.9526, lon: -75.1652, distance: 13000,
    tagline: "The City of Brotherly Love between the Schuylkill & Delaware",
    landmarks: ["Delaware River", "Schuylkill River", "Center City", "Fairmount Park", "Rittenhouse Square", "Old City"],
    description: "Frame historic Philadelphia, Pennsylvania. William Penn's visionary grid nestled between the Schuylkill and Delaware rivers, featuring expansive Fairmount Park."
  },
  "Washington DC": {
    country: "United States", continent: "North America", lat: 38.9072, lon: -77.0369, distance: 12000,
    tagline: "The Capital City of Radial Avenues & Potomac River",
    landmarks: ["National Mall", "Potomac River", "Georgetown", "Capitol Hill", "Rock Creek Park", "Tidal Basin"],
    description: "Pierre L'Enfant's master design comes alive in this Washington, D.C. map poster. Highlighting diagonal grand state avenues, the National Mall, and the Potomac waterfront."
  },
  "New Orleans": {
    country: "United States", continent: "North America", lat: 29.9511, lon: -90.0715, distance: 12000,
    tagline: "The Crescent City on the Mississippi River & Lake Pontchartrain",
    landmarks: ["Mississippi River Crescent", "French Quarter (Vieux Carré)", "Garden District", "Lake Pontchartrain", "Jackson Square"],
    description: "Immerse your space in the soul of New Orleans, Louisiana. Trace the dramatic oxbow curve of the Mississippi River, French Quarter street grids, and Garden District boulevards."
  },
  "Toronto": {
    country: "Canada", continent: "North America", lat: 43.6532, lon: -79.3832, distance: 15000,
    tagline: "Canada's Premier Metropolis on Lake Ontario",
    landmarks: ["Lake Ontario", "Toronto Islands", "CN Tower", "Yonge Street", "Distillery District", "Queen West"],
    description: "Design custom map posters of Toronto, Ontario. Highlights the curved contours of Lake Ontario, the archipelago of the Toronto Islands, and the vast urban ravine systems."
  },
  "Vancouver": {
    country: "Canada", continent: "North America", lat: 49.2827, lon: -123.1207, distance: 12000,
    tagline: "Pacific Ocean Harbor Surrounded by Coastal Mountains",
    landmarks: ["English Bay", "Stanley Park", "Burrard Inlet", "False Creek", "Granville Island", "Gastown"],
    description: "Capture the scenic grandeur of Vancouver, British Columbia. Stanley Park's seawall peninsula, False Creek inlets, and urban grids nestled between sea and sky."
  },
  "Montreal": {
    country: "Canada", continent: "North America", lat: 45.5017, lon: -73.5673, distance: 13000,
    tagline: "Bilingual Island Cultural Capital on the Saint Lawrence River",
    landmarks: ["Saint Lawrence River", "Mount Royal (Mont-Royal)", "Old Montreal", "Plateau-Mont-Royal", "Canal de Lachine"],
    description: "Design custom wall prints of Montreal, Quebec. Defined by the majestic Saint Lawrence River, the green crown of Mount Royal, and historic cobblestone Old Port streets."
  },
  "Honolulu": {
    country: "United States", continent: "North America", lat: 21.3069, lon: -157.8583, distance: 12000,
    tagline: "Tropical Pacific Paradise of Oahu & Diamond Head",
    landmarks: ["Waikiki Beach", "Diamond Head Crater", "Manoa Valley", "Pearl Harbor", "Ala Moana"],
    description: "Immortalize your Hawaiian getaway or honeymoon with a custom map poster of Honolulu, Hawaii. Featuring the sweeping crescent of Waikiki Beach and iconic Diamond Head volcanic ridge."
  },
  "Barcelona": {
    country: "Spain", continent: "Europe", lat: 41.3879, lon: 2.1699, distance: 11000,
    tagline: "Cerdà's Geometric Eixample & Mediterranean Coastline",
    landmarks: ["Eixample Octagonal Grid", "Sagrada Família", "Barceloneta Beach", "Gothic Quarter", "Park Güell"],
    description: "Showcase Ildefons Cerdà's world-famous octagonal block grid of the Eixample district, the Mediterranean beachfront, and the Gothic Quarter of Barcelona, Spain in minimalist vector typography."
  },
  "Amsterdam": {
    country: "Netherlands", continent: "Europe", lat: 52.3676, lon: 4.9041, distance: 9000,
    tagline: "UNESCO World Heritage Concentric Canal Rings",
    landmarks: ["Canal Ring (Grachtengordel)", "Herengracht", "Keizersgracht", "Prinsengracht", "Jordaan"],
    description: "Design an elegant custom map print of Amsterdam, Netherlands. The horseshoe-shaped UNESCO Canal Ring creates one of the most mesmerizing geometric water patterns in modern cartography."
  },
  "Berlin": {
    country: "Germany", continent: "Europe", lat: 52.5200, lon: 13.4050, distance: 15000,
    tagline: "Dynamic European Capital of Culture, Green Parks & Spree Canals",
    landmarks: ["Brandenburg Gate", "Spree River", "Tiergarten", "Museum Island", "Alexanderplatz", "Kreuzberg"],
    description: "Capture the creative energy and historic street layout of Berlin, Germany. Featuring the river Spree, sprawling Tiergarten, and vibrant neighborhoods from Mitte to Kreuzberg."
  },
  "Florence": {
    country: "Italy", continent: "Europe", lat: 43.7696, lon: 11.2558, distance: 8000,
    tagline: "Birthplace of the Renaissance along the Arno River",
    landmarks: ["Arno River", "Ponte Vecchio", "Duomo (Santa Maria del Fiore)", "Piazzale Michelangelo", "Boboli Gardens"],
    description: "Frame your Tuscan romance with a custom map poster of Florence (Firenze), Italy. Featuring the iconic Ponte Vecchio span, the Arno riverbanks, and historic Renaissance palazzi."
  },
  "Vienna": {
    country: "Austria", continent: "Europe", lat: 48.2082, lon: 16.3738, distance: 12000,
    tagline: "Imperial Capital of Classical Music & Circular Ringstraße",
    landmarks: ["Ringstraße Boulevard", "Danube River (Donau)", "Belvedere Palace", "St. Stephen's Cathedral", "Prater Park"],
    description: "Design sophisticated wall art of Vienna (Wien), Austria. Highlight the circular grand Ringstraße boulevard, Danube Canal waterways, and magnificent imperial palace grounds."
  },
  "Zurich": {
    country: "Switzerland", continent: "Europe", lat: 47.3769, lon: 8.5417, distance: 9000,
    tagline: "Alpine Lakeside Elegance on the Shores of Lake Zurich",
    landmarks: ["Lake Zurich (Zürichsee)", "Limmat River", "Old Town (Altstadt)", "Lindenhof", "Uetliberg"],
    description: "Create clean, Swiss-minimalist cartography of Zurich, Switzerland. The junction where the Limmat River flows into Lake Zurich makes for a timeless modern wall display."
  },
  "Madrid": {
    country: "Spain", continent: "Europe", lat: 40.4168, lon: -3.7038, distance: 13000,
    tagline: "Heart of Spain with Royal Boulevards & Lush Retiro Gardens",
    landmarks: ["Gran Vía", "Retiro Park", "Plaza Mayor", "Royal Palace", "Paseo del Prado", "Manzanares River"],
    description: "Render Madrid, Spain in rich vector detail. Featuring the green expanse of El Retiro park, bustling Gran Vía, and historic Habsburg street networks."
  },
  "Dublin": {
    country: "Ireland", continent: "Europe", lat: 53.3498, lon: -6.2603, distance: 11000,
    tagline: "Charming Irish Capital Bisected by the Historic River Liffey",
    landmarks: ["River Liffey", "Temple Bar", "Trinity College", "Phoenix Park", "Dublin Bay", "Ha'penny Bridge"],
    description: "Celebrate Dublin, Ireland with custom map wall decor. Showcasing the River Liffey flowing into Dublin Bay, vast Phoenix Park greenery, and historic Georgian city squares."
  },
  "Prague": {
    country: "Czech Republic", continent: "Europe", lat: 50.0755, lon: 14.4378, distance: 10000,
    tagline: "City of a Hundred Spires on the Winding Vltava River",
    landmarks: ["Vltava River", "Charles Bridge", "Prague Castle", "Old Town Square", "Malá Strana", "Petřín Hill"],
    description: "Design an antique or modernist map poster of Prague (Praha), Czech Republic. Highlights the meanders of the Vltava River, Charles Bridge crossing, and gothic castle district."
  },
  "Budapest": {
    country: "Hungary", continent: "Europe", lat: 47.4979, lon: 19.0402, distance: 11000,
    tagline: "The Queen of the Danube Uniting Historic Buda and Pest",
    landmarks: ["Danube River", "Chain Bridge", "Hungarian Parliament", "Buda Castle", "Fisherman's Bastion", "Margaret Island"],
    description: "Capture the grand majesty of Budapest, Hungary. The wide Danube River dramatically splits the hilly castle heights of Buda from the grand boulevards of Pest."
  },
  "Copenhagen": {
    country: "Denmark", continent: "Europe", lat: 55.6761, lon: 12.5683, distance: 10000,
    tagline: "Nordic Capital of Hygge, Coastal Canals & Bicycle Bridges",
    landmarks: ["Nyhavn Harbor", "The Lakes (Søerne)", "Inderhavnen", "Christianshavn", "Amager"],
    description: "Design Scandinavian minimalist map art of Copenhagen (København), Denmark. Featuring the famous lakes (Søerne), historic harbor waterways, and island connections."
  },
  "Stockholm": {
    country: "Sweden", continent: "Europe", lat: 59.3293, lon: 18.0686, distance: 12000,
    tagline: "Venice of the North Built across 14 Baltic Islands",
    landmarks: ["Stockholm Archipelago", "Gamla Stan", "Lake Mälaren", "Baltic Sea Inlet", "Djurgården", "Södermalm"],
    description: "Stockholm, Sweden is one of the world's most breathtaking island capitals. Frame the intricate meeting of Lake Mälaren with the Baltic Sea archipelago in Scandinavian design themes."
  },
  "Oslo": {
    country: "Norway", continent: "Europe", lat: 59.9139, lon: 10.7522, distance: 11000,
    tagline: "Fjord Capital Surrounded by Green Hills & Blue Waters",
    landmarks: ["Oslofjord", "Aker Brygge", "Vigeland Park", "Bygdøy Peninsula", "Akerselva River"],
    description: "Design an inspiring custom map poster of Oslo, Norway. Trace the dramatic head of the Oslofjord, coastal peninsulas, and the forested hills surrounding the city."
  },
  "Helsinki": {
    country: "Finland", continent: "Europe", lat: 60.1699, lon: 24.9384, distance: 10000,
    tagline: "Daughter of the Baltic with Intricate Coastal Bays",
    landmarks: ["Gulf of Finland", "Suomenlinna Sea Fortress", "Market Square", "Töölönlahti Bay", "Katajanokka"],
    description: "Create a refined Nordic map print of Helsinki, Finland. Celebrated for its unique jagged peninsulas jutting into the Baltic Sea and sea fortress islands."
  },
  "Lisbon": {
    country: "Portugal", continent: "Europe", lat: 38.7223, lon: -9.1393, distance: 11000,
    tagline: "Sun-Drenched City of Seven Hills along the Tagus Estuary",
    landmarks: ["Tagus River (Rio Tejo)", "Alfama", "Belém Tower", "25 de Abril Bridge", "Bairro Alto", "São Jorge Castle"],
    description: "Immortalize Lisbon (Lisboa), Portugal with bespoke wall art. Showcasing the wide estuary of the Tagus River, the historic tram grids of Alfama, and the dramatic suspension bridge."
  },
  "Athens": {
    country: "Greece", continent: "Europe", lat: 37.9838, lon: 23.7275, distance: 12000,
    tagline: "Ancient Cradle of Western Civilization between Mountains and Sea",
    landmarks: ["Acropolis of Athens", "Plaka", "Syntagma Square", "Mount Lycabettus", "Piraeus Port"],
    description: "Frame the ancient streets of Athens, Greece. Spanning from the central rocky outcrop of the Acropolis to the sunlit Mediterranean coastline of the Saronic Gulf."
  },
  "Warsaw": {
    country: "Poland", continent: "Europe", lat: 52.2297, lon: 21.0122, distance: 13000,
    tagline: "The Phoenix City along the Beautiful Vistula River",
    landmarks: ["Vistula River (Wisła)", "Old Town Market Place", "Royal Castle", "Łazienki Park", "Palace of Culture"],
    description: "Design a clean custom map of Warsaw (Warszawa), Poland. Defined by the wild natural east bank of the Vistula River and the vibrant modern urban core of the west bank."
  },
  "Brussels": {
    country: "Belgium", continent: "Europe", lat: 50.8503, lon: 4.3517, distance: 10000,
    tagline: "Capital of Europe with Historic Pentagon Street Ring",
    landmarks: ["Grand Place", "Pentagon Inner Ring", "Royal Palace", "Jubilee Park (Cinquantenaire)", "European Quarter"],
    description: "Showcase Brussels (Bruxelles), Belgium in high-resolution (up to 500 PPI) cartography. Highlighting the historic pentagonal city center, royal boulevards, and green suburban parks."
  },
  "Munich": {
    country: "Germany", continent: "Europe", lat: 48.1351, lon: 11.5820, distance: 12000,
    tagline: "Bavarian Cultural Heart on the Alpine-Fed Isar River",
    landmarks: ["Isar River", "English Garden (Englischer Garten)", "Marienplatz", "Olympiapark", "Nymphenburg Palace"],
    description: "Celebrate Munich (München), Germany. Defined by the green corridor of the Englischer Garten, the swift currents of the Isar River, and historic Bavarian squares."
  },
  "Edinburgh": {
    country: "United Kingdom", continent: "Europe", lat: 55.9533, lon: -3.1883, distance: 10000,
    tagline: "Scottish Capital of Volcanic Crags & Medieval Royal Mile",
    landmarks: ["Royal Mile", "Edinburgh Castle", "Arthur's Seat", "Firth of Forth", "Princes Street Gardens", "Leith"],
    description: "Create a dramatic custom map poster of Edinburgh, Scotland. The ancient volcanic peak of Arthur's Seat, the historic medieval Royal Mile, and coastal Leith harbor."
  },
  "Manchester": {
    country: "United Kingdom", continent: "Europe", lat: 53.4808, lon: -2.2426, distance: 11000,
    tagline: "Industrial Innovation Hub with Historic Canal Networks",
    landmarks: ["River Irwell", "Manchester Ship Canal", "Northern Quarter", "Salford Quays", "Deansgate"],
    description: "Design modern wall prints of Manchester, United Kingdom. Celebrated for its revolutionary canal basins, Northern Quarter creativity, and vibrant urban street grid."
  },
  "Seville": {
    country: "Spain", continent: "Europe", lat: 37.3891, lon: -5.9845, distance: 9000,
    tagline: "The Soul of Andalusia along the Guadalquivir River",
    landmarks: ["Guadalquivir River", "Plaza de España", "Real Alcázar", "Triana Quarter", "Santa Cruz"],
    description: "Capture the romantic magic of Seville (Sevilla), Spain. Featuring the historic curves of the Guadalquivir River, the crescent of Plaza de España, and colorful Triana."
  },
  "Kyoto": {
    country: "Japan", continent: "Asia", lat: 35.0116, lon: 135.7681, distance: 12000,
    tagline: "Ancient Imperial Capital of Zen Temples & Kamo River",
    landmarks: ["Kamo River", "Gion District", "Fushimi Inari", "Arashiyama", "Kyoto Imperial Palace"],
    description: "Design peaceful, minimalist Japanese wall art of Kyoto, Japan. Highlights the symmetrical grid street pattern modeled on ancient Chang'an, flanked by misty green mountains."
  },
  "Osaka": {
    country: "Japan", continent: "Asia", lat: 34.6937, lon: 135.5023, distance: 14000,
    tagline: "Vibrant Water City of Bridges, Canals & Osaka Castle",
    landmarks: ["Osaka Bay", "Dotonbori Canal", "Osaka Castle", "Yodo River", "Umeda", "Namba"],
    description: "Create bold urban map art of Osaka, Japan. The city of waterways, sprawling Yodo River delta, bustling neon Dotonbori canals, and modern Osaka Bay."
  },
  "Singapore": {
    country: "Singapore", continent: "Asia", lat: 1.3521, lon: 103.8198, distance: 16000,
    tagline: "The Garden City Island & Futuristic Marina Bay Basin",
    landmarks: ["Marina Bay", "Singapore River", "Sentosa Island", "Gardens by the Bay", "Orchard Road"],
    description: "Singapore's lush island cartography makes for an extraordinary custom poster. Featuring Marina Bay waterfront reservoirs, Sentosa beaches, and tropical urban parks."
  },
  "Hong Kong": {
    country: "Hong Kong", continent: "Asia", lat: 22.3193, lon: 114.1694, distance: 14000,
    tagline: "World's Most Dramatic Skyline Harbor & Mountain Ridges",
    landmarks: ["Victoria Harbour", "Victoria Peak", "Kowloon Peninsula", "Central District", "Lantau Island"],
    description: "Frame the stunning geography of Hong Kong. Victoria Harbour separating Kowloon from Hong Kong Island, surrounded by dramatic tropical mountain peaks."
  },
  "Seoul": {
    country: "South Korea", continent: "Asia", lat: 37.5665, lon: 126.9780, distance: 15000,
    tagline: "Dynamic Metropolis Divided by the Mighty Han River",
    landmarks: ["Han River (Hangang)", "Namsan Mountain", "Gangnam", "Gyeongbokgung Palace", "Hongdae"],
    description: "Design custom map posters of Seoul, South Korea. The mighty Han River flows through the heart of the city, flanked by iconic mountains and futuristic districts like Gangnam."
  },
  "Bangkok": {
    country: "Thailand", continent: "Asia", lat: 13.7563, lon: 100.5018, distance: 15000,
    tagline: "Venice of the East along the Meandering Chao Phraya",
    landmarks: ["Chao Phraya River", "Grand Palace", "Sukhumvit", "Wat Arun", "Khlong Canals"],
    description: "Celebrate Thailand's vibrant capital with custom map art of Bangkok. Featuring the sweeping oxbow curves of the Chao Phraya River and historic khlong waterways."
  },
  "Dubai": {
    country: "United Arab Emirates", continent: "Middle East", lat: 25.2048, lon: 55.2708, distance: 18000,
    tagline: "Futuristic Coastal Metropolis & Iconic Palm Jumeirah",
    landmarks: ["Palm Jumeirah", "Dubai Marina", "Burj Khalifa", "Dubai Creek", "Downtown Dubai"],
    description: "Design breathtaking custom map posters of Dubai, UAE. Showcasing the palm-tree archipelago of the Palm Jumeirah, Dubai Creek inlet, and modern coastal highways."
  },
  "Bali": {
    country: "Indonesia", continent: "Asia", lat: -8.4095, lon: 115.1889, distance: 35000,
    tagline: "Island of the Gods, Emerald Rice Terraces & Sacred Coasts",
    landmarks: ["Ubud", "Seminyak", "Canggu", "Mount Batur", "Uluwatu Cliffs", "Sanur"],
    description: "Immortalize your Bali tropical honeymoon or surf trip. From the cultural heart of Ubud and spiritual Uluwatu cliffs to the sunset beaches of Canggu and Seminyak."
  },
  "Taipei": {
    country: "Taiwan", continent: "Asia", lat: 25.0330, lon: 121.5654, distance: 13000,
    tagline: "Bustling Island Capital in a Lush Mountain Basin",
    landmarks: ["Taipei 101", "Keelung River", "Tamsui River", "Elephant Mountain", "Ximending", "Daan Forest Park"],
    description: "Design custom wall prints of Taipei, Taiwan. Nestled in a dramatic river basin bordered by lush subtropical green peaks, featuring the iconic Taipei 101."
  },
  "Kuala Lumpur": {
    country: "Malaysia", continent: "Asia", lat: 3.1390, lon: 101.6869, distance: 14000,
    tagline: "Tropical Metropolis of Petronas Towers & River Confluence",
    landmarks: ["Petronas Twin Towers", "Klang River", "Gombak River", "KLCC Park", "Bukit Bintang", "Batu Caves"],
    description: "Showcase Kuala Lumpur, Malaysia in rich high-resolution (up to 500 PPI). Highlighting the historic muddy confluence of the Klang and Gombak rivers, lush city parks, and towering twin spires."
  },
  "Manila": {
    country: "Philippines", continent: "Asia", lat: 14.5995, lon: 120.9842, distance: 14000,
    tagline: "Historic Walled City & Manila Bay Sunsets",
    landmarks: ["Manila Bay", "Pasig River", "Intramuros", "Rizal Park", "Bonifacio Global City (BGC)", "Makati"],
    description: "Capture the vibrant energy of Manila, Philippines. From historic Spanish Intramuros along the Pasig River to the vast western sunsets across Manila Bay."
  },
  "Jakarta": {
    country: "Indonesia", continent: "Asia", lat: -6.2088, lon: 106.8456, distance: 16000,
    tagline: "Dynamic Southeast Asian Capital on the Java Sea",
    landmarks: ["National Monument (Monas)", "Java Sea Coastline", "Ciliwung River", "Kota Tua", "Bundaran HI"],
    description: "Render Jakarta, Indonesia in crisp cartography. Featuring the expansive coastal delta on the Java Sea, Kota Tua heritage canal streets, and modern central avenues."
  },
  "Hanoi": {
    country: "Vietnam", continent: "Asia", lat: 21.0285, lon: 105.8542, distance: 12000,
    tagline: "City of Shaded Lakes along the Majestic Red River",
    landmarks: ["Hoan Kiem Lake", "Red River (Sông Hồng)", "Old Quarter", "West Lake (Hồ Tây)", "French Quarter"],
    description: "Immortalize Hanoi, Vietnam in minimalist elegance. Celebrated for tranquil Hoan Kiem Lake, the wide braided Red River, and historic 36 Guilds street labyrinth."
  },
  "Buenos Aires": {
    country: "Argentina", continent: "South America", lat: -34.6037, lon: -58.3816, distance: 15000,
    tagline: "Paris of South America on the Rio de la Plata",
    landmarks: ["Río de la Plata", "Avenida 9 de Julio", "Puerto Madero", "San Telmo", "La Boca", "Palermo"],
    description: "Design romantic wall art of Buenos Aires, Argentina. Showcasing the widest avenue in the world (Avenida 9 de Julio), Puerto Madero docks, and artistic cobblestone barrios."
  },
  "Rio de Janeiro": {
    country: "Brazil", continent: "South America", lat: -22.9068, lon: -43.1729, distance: 16000,
    tagline: "The Marvelous City between Granite Peaks & Atlantic Beaches",
    landmarks: ["Guanabara Bay", "Copacabana Beach", "Ipanema Beach", "Sugarloaf Mountain", "Christ the Redeemer", "Rodrigo de Freitas Lagoon"],
    description: "Rio de Janeiro, Brazil is blessed with the world's most dramatic natural landscape. Frame the curve of Copacabana, the sheltered lagoon, and towering granite peaks."
  },
  "Santiago": {
    country: "Chile", continent: "South America", lat: -33.4489, lon: -70.6693, distance: 15000,
    tagline: "Chilean Capital Valley Framed by the Snow-Capped Andes",
    landmarks: ["Mapocho River", "San Cristóbal Hill", "Santa Lucía Hill", "Plaza de Armas", "Providencia", "Costanera Center"],
    description: "Create an inspiring custom map poster of Santiago, Chile. The city spreads gracefully across the central valley along the Mapocho River with the Andes towering above."
  },
  "Lima": {
    country: "Peru", continent: "South America", lat: -12.0464, lon: -77.0428, distance: 15000,
    tagline: "The City of Kings atop the Dramatic Pacific Cliffs",
    landmarks: ["Miraflores Boardwalk (Malecón)", "Pacific Ocean Cliffs", "Barranco", "Historic Center", "Rímac River"],
    description: "Showcase Lima, Peru in high-resolution wall art. Highlight the dramatic coastal cliffs of Miraflores overlooking the Pacific surf and the historic colonial center."
  },
  "Mexico City": {
    country: "Mexico", continent: "North America", lat: 19.4326, lon: -99.1332, distance: 18000,
    tagline: "High-Altitude Aztec Basin & Paseo de la Reforma",
    landmarks: ["Zócalo", "Paseo de la Reforma", "Chapultepec Forest", "Coyoacán", "Condesa", "Roma"],
    description: "Celebrate Mexico City (CDMX) with custom cartography. Featuring the historic Zócalo, the grand diagonal boulevard of Paseo de la Reforma, and tree-lined Condesa."
  },
  "Bogota": {
    country: "Colombia", continent: "South America", lat: 4.7110, lon: -74.0721, distance: 16000,
    tagline: "Andean Mountain Plateau & Historic La Candelaria",
    landmarks: ["Monserrate Hill", "La Candelaria", "Plaza de Bolívar", "Simón Bolívar Park", "Chapinero", "Usaquén"],
    description: "Frame Bogotá, Colombia in modern minimalist print. Highlighting the eastern mountain ridge of Monserrate and the vast grid spanning the high Andean savanna."
  },
  "Istanbul": {
    country: "Turkey", continent: "Europe", lat: 41.0082, lon: 28.9784, distance: 16000,
    tagline: "The Transcontinental Jewel Straddling Europe and Asia",
    landmarks: ["Bosphorus Strait", "Golden Horn (Haliç)", "Hagia Sophia", "Galata Tower", "Kadıköy", "Sultanahmet"],
    description: "Istanbul, Turkey unites two continents across the deep blue Bosphorus Strait. A breathtaking map subject with the Golden Horn inlet and ancient peninsulas."
  },
  "Cairo": {
    country: "Egypt", continent: "Africa", lat: 30.0444, lon: 31.2357, distance: 16000,
    tagline: "The Cradle of Civilizations along the Timeless Nile River",
    landmarks: ["Nile River", "Giza Plateau", "Tahrir Square", "Zamalek Island", "Islamic Cairo", "Al-Azhar"],
    description: "Design an epic map art print of Cairo, Egypt. Centered on the wide fertile bends of the eternal River Nile, Zamalek Island, and the ancient historic capital."
  },
  "Sydney": {
    country: "Australia", continent: "Oceania", lat: -33.8688, lon: 151.2093, distance: 15000,
    tagline: "World's Most Beautiful Natural Drowned-River Harbour",
    landmarks: ["Sydney Harbour", "Sydney Opera House", "Harbour Bridge", "Bondi Beach", "Manly", "Darling Harbour"],
    description: "Design an iconic Australian custom map poster of Sydney, NSW. Highlighting the intricate sheltered inlets of Sydney Harbour, Harbour Bridge, and world-famous Bondi Beach."
  },
  "Melbourne": {
    country: "Australia", continent: "Oceania", lat: -37.8136, lon: 144.9631, distance: 14000,
    tagline: "Australia's Cultural Capital of Hoddle Grid & Laneways",
    landmarks: ["Yarra River", "Port Phillip Bay", "Hoddle Grid", "St Kilda Beach", "Fitzroy", "Royal Botanic Gardens"],
    description: "Frame Melbourne, Victoria with clean typography. Featuring Robert Hoddle's classic 1837 urban street grid, the scenic Yarra River, and the shoreline of Port Phillip Bay."
  },
  "Auckland": {
    country: "New Zealand", continent: "Oceania", lat: -36.8485, lon: 174.7633, distance: 14000,
    tagline: "The City of Sails Straddling Two Natural Harbours",
    landmarks: ["Waitemata Harbour", "Manukau Harbour", "Mount Eden", "Rangitoto Island", "Viaduct Harbour", "Ponsonby"],
    description: "Capture Auckland (Tāmaki Makaurau), New Zealand. Nestled on a narrow volcanic isthmus between the Pacific Waitematā Harbour and Tasman Manukau Harbour."
  },
  "Brisbane": {
    country: "Australia", continent: "Oceania", lat: -27.4698, lon: 153.0251, distance: 14000,
    tagline: "Subtropical Sunshine Capital along the Curving Brisbane River",
    landmarks: ["Brisbane River", "South Bank", "Story Bridge", "Kangaroo Point Cliffs", "Fortitude Valley", "New Farm"],
    description: "Design bright modern map wall decor of Brisbane, Queensland. Defined by the looping snake-like meanders of the Brisbane River and lush riverside parklands."
  },
  "Perth": {
    country: "Australia", continent: "Oceania", lat: -31.9505, lon: 115.8605, distance: 14000,
    tagline: "Sunniest Capital on the Expansive Swan River Estuary",
    landmarks: ["Swan River", "Kings Park", "Cottesloe Beach", "Fremantle", "Elizabeth Quay", "Perth Water"],
    description: "Showcase Perth, Western Australia. Highlighting the broad reflective waters of the Swan River, massive natural Kings Park, and pristine Indian Ocean beaches."
  },
  "Cape Town": {
    country: "South Africa", continent: "Africa", lat: -33.9249, lon: 18.4241, distance: 14000,
    tagline: "Dramatic Meeting of Two Oceans under Table Mountain",
    landmarks: ["Table Mountain", "Table Bay", "Camps Bay", "V&A Waterfront", "Lion's Head", "Cape Point"],
    description: "Design majestic wall art of Cape Town, South Africa. Defined by the flat plateau of Table Mountain, Lion's Head, Atlantic beaches of Camps Bay, and historic Table Bay."
  }
};

const directoryPath = path.resolve(__dirname, '../src/data/cityDirectory.json');
const cityDirectory = JSON.parse(fs.readFileSync(directoryPath, 'utf8'));

const output = [];

for (let i = 0; i < cityDirectory.length; i++) {
  const item = cityDirectory[i];
  const custom = CITY_DATABASE[item.city] || Object.values(CITY_DATABASE).find(c => c.slug === item.slug);

  const landmarks = custom?.landmarks && custom.landmarks.length > 0
    ? custom.landmarks
    : (item.landmarks && item.landmarks.length > 0
        ? item.landmarks
        : [
            `${item.city} City Center`,
            `${item.city} Waterfront & Riverways`,
            `${item.city} Historic Quarter`,
            'Metropolitan District',
            'Botanical Gardens & Parks'
          ]);

  const tagline = custom?.tagline || (
    item.isCapital
      ? `Historic Capital City of ${item.country} & Scenic Street Grid`
      : `Vibrant Cartographic Destination in ${item.country} & Urban Grid`
  );

  const description = custom?.description || (
    `Design museum-quality custom map posters of ${item.city}, ${item.country}. Capture the iconic street grids, coastal contours, and historic districts of this ${item.continent} destination in ultra-high resolution (up to 500 PPI Ultra-HD). Perfect for travel memories, personalized anniversary gifts, and modern minimalist wall decor.`
  );

  output.push({
    slug: item.slug,
    city: item.city,
    country: item.country,
    countryCode: item.countryCode,
    continent: item.continent,
    lat: item.lat,
    lon: item.lon,
    distanceMeters: custom?.distance || 14000,
    landmarks,
    tagline,
    description,
    rank: i + 1,
    annualSearches: custom?.annualSearches || `Curated World City • ${item.country}`,
    metaDescription: custom?.metaDescription || `Create a custom map poster of ${item.city}, ${item.country}, featuring ${landmarks[0]} and ${landmarks[1] || item.city}. Edit for free; pay to download.`
  });
}

const targetPath = path.resolve(__dirname, '../src/data/seoCities.json');
fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`Generated complete SEO cities database with ${output.length} cities at: ${targetPath}`);
