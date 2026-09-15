(function(root){
  "use strict";
  const VALID_TYPES=new Set(["vehicle","bakkie","suv","motorcycle_leisure"]);
  const MANUAL_BAKKIE_IDS=new Set(["235"]);
  function text(value){return String(value||"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9/]+/g," ").replace(/\s+/g," ").trim()}
  function fields(v){return{make:text(v.make),model:text(v.model),variant:text(v.variant),title:text(v.title),body:text(v.body_type||v.bodyType),makeModel:text([v.make,v.model].filter(Boolean).join(" ")),identity:text([v.make,v.model,v.variant,v.title].filter(Boolean).join(" "))}}
  function deliberatelySelected(v){const saved=String(v.listing_type||"");if(!VALID_TYPES.has(saved))return"";if(saved!=="vehicle")return saved;return v.listing_type_selected===true||v.listingTypeSelected===true?saved:""}
  function isMotorcycleOrLeisure(v){const f=fields(v);if(/^(yamaha|kawasaki|triumph|harley davidson|ktm|ducati|husqvarna)$/.test(f.make))return true;return /\b(r1200 gs|rr 1000|cbr 1000|fireblade|motorcycle|motorbike|quad bike|caravan|trailer|boat|jetski|jet ski)\b/.test(f.identity)}
  function hasBakkieBodyWording(v){const f=fields(v);if(/^(bakkie|pickup|pick up|single cab|double cab|extended cab|extra cab|supercab|super cab|club cab|dropside|cab chassis)$/.test(f.body))return true;const x=text([v.variant,v.title].filter(Boolean).join(" "));return /\b(pickup|pick up|bakkie|single cab|double cab|extended cab|extra cab|supercab|super cab|club cab|dropside|cab chassis)\b/.test(x)||/\bp\s*\/\s*u\b/.test(x)||/\bs\s*\/\s*c\b/.test(x)||/\bd\s*\/\s*c\b/.test(x)||/\b(single|double|extended|extra|super|club)\s+cab\b/.test(x)||/\b[sd]\s*cab\b/.test(x)}
  function isBakkie(v){const f=fields(v),m=f.makeModel;if(MANUAL_BAKKIE_IDS.has(String(v.id)))return true;if(hasBakkieBodyWording(v))return true;if(/\btoyota hilux\b/.test(m))return true;if(f.make==="toyota"&&/^land ?cruiser\b/.test(f.model)&&/\b79\b/.test(f.identity))return true;if(/\bford (ranger|bantam|raptor|wildtrack|wildtrak)\b/.test(m))return true;if(/\bisuzu (d max|dmax|kb|kb280|kb300|x rider)\b/.test(m))return true;if(/\bnissan (navara|np200|np300|hardbody)\b/.test(m))return true;if(/\bvolkswagen amarok\b/.test(m))return true;if(/\bmahindra (pik up|pick up|bolero)\b/.test(m))return true;if(/\bmitsubishi (triton|colt)\b/.test(m))return true;if(/\bmazda (bt 50|bt50|drifter)\b/.test(m))return true;if(/\bchevrolet utility\b/.test(m))return true;if(/\bgwm (p series|steed)\b/.test(m))return true;if(/\bjac (t6|t8|t9|x200)\b/.test(m))return true;if(/\bldv t60\b/.test(m)||/\bpeugeot landtrek\b/.test(m))return true;if(/\bfoton (tunland|g7|v7|v9|miler|truck mate)\b/.test(m))return true;if(/\bdfsk k01s\b/.test(m)||/\bhyundai h100\b/.test(m))return true;if(/\bkia (k2500|k2700)\b/.test(m))return true;return false}
  const SUV_MODELS=[
    ["audi",/^(q2|q3|q5|q7|q8)\b/],["baic",/^(b30|b40|beijing x55|x25|x55)\b/],["bmw",/^(x1|x2|x3|x4|x5|x6|x7|xm)\b/],
    ["cherry omoda",/^omoda c5\b/],["chery",/^(jaecoo j7|tiggo)\b/],["chevrolet",/^(captiva|trailblazer|trailbrazer)\b/],
    ["daihatsu",/^terios\b/],["diahatsu",/^terios\b/],["dodge",/^journey\b/],["ford",/^(eco sport|ecosport|everest|kuga|puma|territory)\b/],
    ["haval",/^(h1|h2|h6|h7|h9|jolion)\b/],["honda",/^(br v|cr v|hr v)\b/],["hyundai",/^(creta|grand creta|ix35|tucson|venue|santa fe)\b/],
    ["jeep",/^(grand cherokee|cherokee|compass|renegade|wrangler)\b/],["jetour",/^(dashing|x70|x90)\b/],["kia",/^(seltos|sonet|sportage|sorento)\b/],
    ["land rover",/^(defender|discovery|evoque|range rover)\b/],["landrover",/^(defender|discovery|evoque|range rover)\b/],
    ["mahindra",/^(kuv 100|kuv100|kuv300|scorpio n|xuv 3x0|xuv300|xuv700)\b/],["mazda",/^(cx 3|cx3|cx 30|cx 5|cx 60|cx 90)\b/],
    ["mercedes benz",/^(gla|glb|glc|gle|gls|g class)\b/],["mercedez benz",/^(gla|glb|glc|gle|gls|g class)\b/],
    ["mg",/^hs\b/],["mini cooper",/.*countryman\b/],["mitsubishi",/^(asx|pajero|pajero sport|outlander|eclipse cross)\b/],
    ["nissan",/^(juke|qashqai|x trail|patrol|magnite)\b/],["omoda",/^c5\b/],["opel",/^(mokka|crossland|grandland)\b/],["opel ",/^(mokka|crossland|grandland)\b/],
    ["proton",/^x50\b/],["renault",/^(captur|capture|duster|kiger|koleos)\b/],["suzuki",/^(brezza|fronx|jimny|grand vitara|vitara)\b/],
    ["toyota",/^(c hr|corolla cross|fortuner|prado|rav 4|rav4|urban cruiser)\b/],["volkswagen",/^(t cross|taigo|tiguan|tiquan|touareg)\b/],["volvo",/^(xc40|xc60|xc90)\b/]
  ];
  function isSuv(v){const f=fields(v);if(isBakkie(v)||isMotorcycleOrLeisure(v))return false;if(/^(suv|crossover|sport utility vehicle)$/.test(f.body))return true;if(f.make==="toyota"&&/^land ?cruiser\b/.test(f.model)){if(/\b(76|78|80|100|105|200|300|wagon|station wagon|lx)\b/.test(f.identity))return true;return false}if(/\bbmw x[1-7]\b/.test(f.identity)||/\bmini cooper countryman\b/.test(f.identity)||/\blandrover discovery\b/.test(f.identity))return true;return SUV_MODELS.some(function(rule){return f.make===rule[0]&&rule[1].test(f.model)})}
  function isAmbiguous(v){const f=fields(v);if(f.make==="toyota"&&/^land ?cruiser\b/.test(f.model)&&!isBakkie(v)&&!isSuv(v))return true;return !f.make||!f.model}
  function classify(v){const chosen=deliberatelySelected(v);if(chosen)return chosen;if(isMotorcycleOrLeisure(v))return"motorcycle_leisure";if(isBakkie(v))return"bakkie";if(isSuv(v))return"suv";return"vehicle"}
  root.CarScoutListingClassification={classify,isBakkie,isSuv,isMotorcycleOrLeisure,isAmbiguous,deliberatelySelected};
})(typeof window!=="undefined"?window:globalThis);
