/* WasteWise AI — knowledge base, streams, bins, demo datasets
   8 internal detailed streams mapped to 3 configurable physical bins */

const STREAMS = {
  organic:  {name:"Organic / Biodegradable", bin:"wet"},
  paper:    {name:"Paper",                   bin:"dry"},
  plastic:  {name:"Plastic",                 bin:"dry"},
  metal:    {name:"Metal",                   bin:"dry"},
  glass:    {name:"Glass",                   bin:"dry"},
  ewaste:   {name:"E-Waste",                 bin:"special"},
  hazardous:{name:"Hazardous",               bin:"special"},
  sanitary: {name:"Sanitary / Medical",      bin:"special"}
};

const BINS = {
  wet:    {key:"wet",    color:"green", icon:"🟢", label:"WET",        sub:"BIODEGRADABLE"},
  dry:    {key:"dry",    color:"blue",  icon:"🔵", label:"DRY",        sub:"RECYCLABLE"},
  special:{key:"special",color:"red",   icon:"🔴", label:"SPECIAL",    sub:"HAZADOUS"}
};

/* ~50 item types: name, stream, icon, prep, reason, keywords, confidence */
const KB = [
 {n:"Banana Peel",s:"organic",i:"🍌",prep:"Place directly in the wet bin.",r:"Organic biodegradable waste under the campus wet-waste rule.",k:["banana","peel"],c:94},
 {n:"Apple Core",s:"organic",i:"🍎",prep:"Place directly in the wet bin.",r:"Food residue is biodegradable and belongs to the wet stream.",k:["apple","core"],c:93},
 {n:"Food Leftovers",s:"organic",i:"🍛",prep:"Remove any packaging first, then place in the wet bin.",r:"Cooked food is biodegradable under the local wet-waste rule.",k:["food","leftover","leftovers","rice","curry"],c:92},
 {n:"Vegetable Peels",s:"organic",i:"🥕",prep:"Place directly in the wet bin.",r:"Kitchen scrap — biodegradable wet stream.",k:["vegetable","peel","peels","carrot","onion"],c:92},
 {n:"Tea Waste / Coffee Grounds",s:"organic",i:"🍵",prep:"Empty the leaves/grounds into the wet bin; tea bags go to dry.",r:"Organic residue is wet waste per campus guide section 3.",k:["tea","coffee","grounds"],c:88},
 {n:"Egg Shells",s:"organic",i:"🥚",prep:"Place directly in the wet bin.",r:"Biodegradable kitchen waste.",k:["egg","shell"],c:90},
 {n:"Bread / Bakery Waste",s:"organic",i:"🍞",prep:"Place directly in the wet bin.",r:"Food item — biodegradable wet stream.",k:["bread","bakery","cake"],c:90},
 {n:"Fruit Peels & Seeds",s:"organic",i:"🍊",prep:"Place directly in the wet bin.",r:"Biodegradable organic waste.",k:["fruit","orange","peel","seeds"],c:90},
 {n:"Garden / Leaf Waste",s:"organic",i:"🍃",prep:"Place in the wet bin or garden collection point.",r:"Green waste is biodegradable.",k:["leaf","leaves","garden","grass"],c:87},
 {n:"Paper",s:"paper",i:"📄",prep:"Keep dry and place in the dry bin.",r:"Clean paper is recyclable dry waste.",k:["paper","sheet","newspaper","magazine","notebook"],c:91},
 {n:"Cardboard",s:"paper",i:"📦",prep:"Flatten and keep dry; place in the dry bin.",r:"Cardboard is recyclable paper stream.",k:["cardboard","carton","box"],c:90},
 {n:"Paper Cup (clean)",s:"paper",i:"🥤",prep:"If clean and unlined, dry bin; if food-soiled or plastic-lined, check local rule.",r:"Paper cups may be lined — rule depends on local processing.",k:["paper","cup","cups"],c:72},
 {n:"Notebook / Books",s:"paper",i:"📓",prep:"Donate if reusable; otherwise dry bin.",r:"Paper stream — recyclable.",k:["book","notebook","books"],c:89},
 {n:"Plastic Bottle",s:"plastic",i:"🍶",prep:"Empty liquid, rinse if required, crush, cap on; dry bin.",r:"Clean rigid plastic is recyclable in the dry stream.",k:["plastic","bottle","water"],c:95},
 {n:"Plastic Wrapper / Chips Packet",s:"plastic",i:"🍬",prep:"Empty contents; place in the dry bin.",r:"Flexible plastic is dry waste under campus rule.",k:["wrapper","chips","packet","chocolate"],c:83},
 {n:"Plastic Container",s:"plastic",i:"🫙",prep:"Rinse if required; place in the dry bin.",r:"Rigid plastic — recyclable dry stream.",k:["container","tupperware"],c:90},
 {n:"Plastic Bag",s:"plastic",i:"🛍️",prep:"Empty and place in the dry bin.",r:"Flexible plastic — dry stream.",k:["bag","carry"],c:85},
 {n:"Plastic Cutlery / Straw",s:"plastic",i:"🍴",prep:"Place in the dry bin.",r:"Single-use plastic — dry waste stream.",k:["cutlery","straw","spoon","fork"],c:82},
 {n:"Tetra Pak",s:"plastic",i:"🧃",prep:"Empty, rinse, flatten; place in dry bin if accepted locally.",r:"Composite packaging — follow local acceptance rule.",k:["tetra","juice","pak"],c:74},
 {n:"Thermocol / Styrofoam",s:"plastic",i:"🧊",prep:"Place in the dry bin if accepted; otherwise follow local instruction.",r:"Check local rule — acceptance varies by facility.",k:["thermocol","styrofoam","foam"],c:68},
 {n:"Aluminium Can",s:"metal",i:"🥫",prep:"Empty and lightly rinse; place in the dry bin.",r:"Metal is recyclable in the dry stream.",k:["aluminium","aluminum","can","soda"],c:94},
 {n:"Tin / Steel Can",s:"metal",i:"🛢️",prep:"Empty and rinse; place in the dry bin.",r:"Metal — recyclable dry stream.",k:["tin","steel","can"],c:93},
 {n:"Steel Utensils",s:"metal",i:"🍳",prep:"Donate if usable; otherwise dry bin.",r:"Metal — recyclable.",k:["utensil","steel","spoon","plate"],c:88},
 {n:"Glass Bottle",s:"glass",i:"🍾",prep:"Empty, rinse if required; place carefully in the dry bin.",r:"Glass is recyclable in the dry stream.",k:["glass","bottle"],c:94},
 {n:"Broken Glass",s:"glass",i:"🔍",prep:"Wrap in paper, label, and place in dry bin as per local rule.",r:"Glass — handle safely; dry stream.",k:["broken","glass","mirror"],c:80},
 {n:"Mirror / Window Glass",s:"glass",i:"🪞",prep:"Wrap and place in dry bin as per local rule.",r:"Glass — check local acceptance.",k:["mirror","window"],c:76},
 {n:"Battery",s:"hazardous",i:"🔋",prep:"Do NOT put in any bin. Use the Special / Hazardous collection point.",r:"Batteries contain toxic chemicals — special handling required.",k:["battery","batteries","cell"],c:96},
 {n:"Old Phone / E-waste",s:"ewaste",i:"📱",prep:"Deposit at the e-waste collection point.",r:"E-waste requires separate certified recycling.",k:["phone","mobile","e-waste","ewaste","charger","cable","earphone","laptop"],c:95},
 {n:"Charging Cable / Adapter",s:"ewaste",i:"🔌",prep:"Deposit at the e-waste collection point.",r:"Electronic accessory — e-waste stream.",k:["cable","charger","adapter","usb"],c:92},
 {n:"Medicine Packaging",s:"hazardous",i:"💊",prep:"Follow pharmacy take-back or special waste point.",r:"Medicine-related waste needs special handling.",k:["medicine","tablet","strip","pharma"],c:84},
 {n:"Expired Medicines",s:"hazardous",i:"🧴",prep:"Never flush. Return to pharmacy or special point.",r:"Hazardous — special disposal stream.",k:["expired","medicine","syrup"],c:85},
 {n:"Sanitary Waste",s:"sanitary",i:"🩹",prep:"Wrap securely and use the sanitary disposal bin/point.",r:"Sanitary waste — special stream, never mixed.",k:["sanitary","pad","napkin"],c:88},
 {n:"Diapers",s:"sanitary",i:"👶",prep:"Wrap securely; use sanitary disposal point per local rule.",r:"Sanitary waste — special stream.",k:["diaper","diapers","nappy"],c:82},
 {n:"Used Mask / Gloves",s:"sanitary",i:"😷",prep:"Fold, wrap and place in the special/sanitary point.",r:"Contaminated protective waste — special stream.",k:["mask","gloves","ppe"],c:83},
 {n:"Paint / Chemical Container",s:"hazardous",i:"🎨",prep:"Do NOT rinse into drains. Use hazardous collection.",r:"Chemical residue — hazardous stream.",k:["paint","chemical","thinner"],c:86},
 {n:"Cleaning Product Bottle",s:"hazardous",i:"🧴",prep:"Empty fully; check local rule — often special stream.",r:"Chemical container — follow local rule.",k:["cleaning","detergent","shampoo","chemical"],c:71},
 {n:"CFL Bulb / Tube Light",s:"hazardous",i:"💡",prep:"Handle carefully; deposit at special/e-waste point.",r:"Contains mercury — special handling.",k:["bulb","cfl","tube","light"],c:89},
 {n:"Incandescent Bulb",s:"glass",i:"💡",prep:"Wrap safely; dry bin per local rule.",r:"Check local acceptance for bulb glass.",k:["bulb","light"],c:66},
 {n:"Cloth / Old Clothes",s:"dry-other",i:"👕",prep:"Donate if usable; otherwise dry bin per local rule.",r:"Textile — dry stream or donation.",k:["cloth","clothes","shirt","fabric"],c:78},
 {n:"Shoes / Footwear",s:"dry-other",i:"👟",prep:"Donate if usable; otherwise dry bin per local rule.",r:"Textile/rubber — dry stream.",k:["shoes","footwear","sandal"],c:75},
 {n:"Wood / Toothpick",s:"organic",i:"🪵",prep:"Small wooden items go to the wet bin.",r:"Untreated wood is biodegradable.",k:["wood","toothpick","stick","ice cream stick"],c:81},
 {n:"Chewing Gum",s:"organic",i:"🍬",prep:"Wrap in paper; place in wet bin.",r:"Organic — wet stream per campus guide.",k:["gum","chewing"],c:77},
 {n:"Coconut Shell",s:"organic",i:"🥥",prep:"Place in wet bin or garden waste point.",r:"Hard biodegradable — wet stream.",k:["coconut","shell"],c:83},
 {n:"Used Tissue / Napkin (food)",s:"organic",i:"🧻",prep:"Food-soiled tissue goes to the wet bin.",r:"Soiled paper — wet stream per local rule.",k:["tissue","napkin","soiled"],c:79},
 {n:"Dry Tissue / Paper Towel",s:"paper",i:"🧻",prep:"Clean dry tissue — dry bin.",r:"Clean paper — dry stream.",k:["tissue","towel"],c:74},
 {n:"Bubble Wrap",s:"plastic",i:"🫧",prep:"Deflate and place in the dry bin.",r:"Flexible plastic — dry stream.",k:["bubble","wrap"],c:80},
 {n:"Foil / Aluminium Foil",s:"metal",i:"🥈",prep:"Clean foil — dry bin; heavily soiled — wet bin.",r:"Metal — dry stream when clean.",k:["foil","aluminium"],c:76},
 {n:"Cigarette Butt",s:"sanitary",i:"🚬",prep:"Extinguish fully; special point per local rule.",r:"Contaminated waste — special stream.",k:["cigarette","butt","smoking"],c:73},
 {n:"Pen / Stationery (plastic)",s:"plastic",i:"🖊️",prep:"Place in the dry bin.",r:"Mixed plastic — dry stream.",k:["pen","stationery","marker"],c:78},
 {n:"Ceramic / Mug",s:"dry-other",i:"☕",prep:"Wrap and place in dry bin; donate if usable.",r:"Ceramic — dry stream, not recyclable glass.",k:["ceramic","mug","cup","plate"],c:70}
];

const LOCAL_RULES = [
 {id:"R1", src:"Campus Waste Management Guide", sec:"Section 3", text:"Food and biodegradable material should be placed in the wet waste stream."},
 {id:"R2", src:"Campus Waste Management Guide", sec:"Section 4", text:"Clean paper, cardboard, plastics, metal and glass are recyclable and belong to the dry waste stream."},
 {id:"R3", src:"Campus Waste Management Guide", sec:"Section 5", text:"Batteries, e-waste, chemicals, medicines and sanitary waste require special handling and must use the Special / Hazardous collection points."},
 {id:"R4", src:"Hostel Handbook", sec:"Chapter 7", text:"Rinse food containers before placing them in the dry bin to avoid contamination."},
 {id:"R5", src:"Municipal Guidance", sec:"Annex B", text:"Plastic bottles should be emptied and crushed before disposal in the recyclable stream."},
 {id:"R6", src:"Campus Waste Management Guide", sec:"Section 6", text:"When uncertain, do not guess — check the Bin Guide or submit a query."}
];

const LOCATIONS = [
 {id:"cafeteria", name:"Campus Cafeteria", bins:["wet","dry","special"], contact:"canteen@campus.edu"},
 {id:"hostel", name:"Hostel Block", bins:["wet","dry","special"], contact:"hostel@campus.edu"},
 {id:"academic", name:"Academic Block", bins:["wet","dry","special"], contact:"facilities@campus.edu"}
];

/* Demo analytics dataset — clearly labelled demo data */
const DEMO_STATS = {totalScans:1248, correct:86, review:8, notsure:6};
const DEMO_CHARTS = {
 categories:[["Organic",34],["Plastic",26],["Paper",16],["Glass",9],["Metal",7],["E-waste",4],["Hazardous",3],["Sanitary",1]],
 confusing:[["Plastic wrapper",42],["Paper cup",31],["Tetra pak",27],["Cleaning bottle",22],["Tissue",18]],
 feedback:[["Correct",86],["Incorrect",8],["Not sure",6]],
 queries:[["Local rule mismatch",34],["Item not recognized",26],["Wrong AI answer",18],["Bin issue",12],["Voice issue",10]],
 languages:[["English",61],["Telugu",24],["Hindi",15]]
};
