// Shared South African derivative suggestions, checkpoint 2026-11-20.
// Not an exhaustive vehicle identification database. Manual entry remains available.
window.CARSCOUT_DERIVATIVES = {
"Toyota":{"Hilux":["2.4 GD-6 SR 4x2","2.4 GD-6 Raider 4x2","2.4 GD-6 Raider 4x4","2.8 GD-6 Raider 4x2","2.8 GD-6 Raider 4x4","2.8 GD-6 Legend 4x4","2.8 GD-6 Legend RS 4x4","2.7 VVTi 4x2"],"Fortuner":["2.4 GD-6 4x2","2.8 GD-6 4x2","2.8 GD-6 4x4","2.8 GD-6 VX 4x4"],"Land Cruiser":["4.0 V6 Petrol","4.2 Diesel","4.5 V8 Diesel"]},
"Ford":{"Ranger":["2.2 TDCi XL 4x2","2.2 TDCi XL 4x4","2.2 TDCi XLS 4x2","2.2 TDCi XLT 4x2","2.2 TDCi XLT 4x4","3.2 TDCi XLT 4x4","3.2 TDCi Wildtrak 4x4","2.0 SiT XLT 4x2","2.0 Bi-Turbo Wildtrak 4x4","2.0 Bi-Turbo Raptor 4x4"],"Everest":["2.2 TDCi XLT","3.2 TDCi XLT 4x4","2.0 Bi-Turbo Limited 4x4"],"Fiesta":["1.0 EcoBoost Trend","1.0 EcoBoost Titanium","1.6 ST"]},
"Volkswagen":{"Polo":["1.0 TSI Trendline","1.0 TSI Comfortline","1.0 TSI Highline","2.0 GTI"],"Polo Vivo":["1.4 Trendline","1.4 Comfortline","1.4 Life","1.6 Comfortline","1.6 Highline","1.0 TSI GT"],"Tiguan":["1.4 TSI Trendline","1.4 TSI Comfortline","2.0 TDI Comfortline 4Motion"]},
"Isuzu":{"D-Max":["250C Single Cab","250 LE Double Cab","300 LX Double Cab","1.9 Ddi LS","3.0 Ddi LSE","3.0 Ddi V-Cross"],"KB":["250 D-TEQ LE","250 D-TEQ LX","300 D-TEQ LX"]},
"Nissan":{"Navara":["2.3D SE","2.3D LE","2.3D PRO-4X","2.5 dCi LE"],"NP200":["1.6 8V Base","1.6 16V SE","1.5 dCi SE"]},
"Hyundai":{"Grand i10":["1.0 Motion","1.25 Motion","1.25 Fluid"],"i20":["1.2 Motion","1.4 Fluid"],"Tucson":["2.0 Premium","2.0 Executive","1.6 TGDI Elite"]},
"Kia":{"Picanto":["1.0 Start","1.0 Street","1.2 Style","1.2 Smart"],"Sonet":["1.5 LX","1.5 EX","1.0T EX"]},
"Mahindra":{"Pik Up":["2.2 mHawk S4","2.2 mHawk S6","2.2 mHawk S10","2.2 mHawk S11"]},
"BMW":{"1 Series":["116i","118i","120i","125i","128ti","M135i","116d","118d","120d","125d"],"2 Series":["218i","220i","220d","225i","228i","230i","M235i","M240i"],"3 Series":["318i","320i","320d","325i","328i","330i","330d","335i","340i","M340i","M3"],"4 Series":["420i","420d","430i","430d","435i","440i","M440i","M4"],"5 Series":["520i","520d","523i","525d","530i","530d","535i","540i","M550i","M5"],"X1":["sDrive18i","sDrive18d","sDrive20i","xDrive20d","xDrive25i"],"X2":["sDrive18i","sDrive20i","xDrive20d","M35i"],"X3":["sDrive18d","xDrive20d","xDrive30d","xDrive30i","M40i","X3 M"],"X5":["xDrive30d","xDrive40d","xDrive40i","xDrive45e","M50d","X5 M"]},
"Mercedes-Benz":{"C-Class":["C180","C200","C220d","C300"],"GLC":["GLC 220d","GLC 300d"]}
};

// Suzuki variants commonly encountered in South African used stock.
// Dealers can always retain or type a more precise specification.
window.CARSCOUT_DERIVATIVES["Suzuki"] = {
  "Swift":["1.2 GA","1.2 GL","1.2 GL+","1.2 GLX","1.4 GLS","1.4 GLX","1.4 Sport","1.6 Sport"],
  "Dzire":["1.2 GA","1.2 GL","1.2 GL+","1.2 GLX"],
  "Baleno":["1.4 GL","1.4 GLX","1.5 GL","1.5 GLX"],
  "Vitara":["1.6 GL","1.6 GL+","1.6 GLX","1.4T GLX"],
  "Jimny":["1.3","1.5 GA","1.5 GL","1.5 GLX"],
  "S-Presso":["1.0 GL","1.0 GL+","1.0 S-Edition"],
  "Ertiga":["1.5 GA","1.5 GL","1.5 GLX"],
  "Celerio":["1.0 GA","1.0 GL"],
  "Ignis":["1.2 GL","1.2 GLX"],
  "Fronx":["1.5 GL","1.5 GLX"],
  "Grand Vitara":["1.5 GL","1.5 GLX"]
};

// Additional common South African used-vehicle trim names (not year-specific).
// These are suggestions, not a VIN/M&M-certified model-year catalogue.
Object.assign(window.CARSCOUT_DERIVATIVES, {
 "Audi":{"A1":["1.0 TFSI","1.4 TFSI","30 TFSI","35 TFSI","S1"],"A3":["1.0 TFSI","1.4 TFSI","1.8 TFSI","2.0 TDI","35 TFSI","40 TFSI","S3","RS3"],"A4":["1.4 TFSI","2.0 TFSI","2.0 TDI","35 TFSI","40 TFSI","S4"],"Q3":["1.4 TFSI","2.0 TDI","35 TFSI","40 TFSI quattro"],"Q5":["2.0 TDI","2.0 TFSI","40 TDI","45 TFSI","SQ5"]},
 "Honda":{"Jazz":["1.2 Trend","1.5 Comfort","1.5 Elegance","1.5 Executive"],"Civic":["1.8 Comfort","1.8 Elegance","1.5T Sport","Type R"],"Ballade":["1.5 Comfort","1.5 Elegance","1.5 Executive"],"CR-V":["2.0 Comfort","2.0 Elegance","1.5T Executive","1.6 i-DTEC"]},
 "Mazda":{"Mazda2":["1.5 Active","1.5 Dynamic","1.5 Individual"],"Mazda3":["1.6 Original","1.6 Dynamic","2.0 Individual","2.0 Astina"],"CX-3":["2.0 Active","2.0 Dynamic","2.0 Individual"],"CX-5":["2.0 Active","2.0 Dynamic","2.0 Individual","2.2 DE Akera"],"BT-50":["2.2 SLX","3.2 SLE","1.9 Active","3.0 Dynamic"]},
 "Renault":{"Kwid":["1.0 Expression","1.0 Dynamique","1.0 Climber"],"Clio":["0.9 Turbo Expression","0.9 Turbo Dynamique","1.2 Turbo GT-Line","RS"],"Duster":["1.5 dCi Dynamique","1.5 dCi Prestige","1.3 Turbo Intens"],"Triber":["1.0 Expression","1.0 Dynamique","1.0 Prestige"],"Kiger":["1.0 Life","1.0 Zen","1.0 Intens","1.0 Turbo Intens"]},
 "Opel":{"Corsa":["1.0T Enjoy","1.0T Cosmo","1.2 Edition","1.4 Enjoy","1.4 Sport"],"Astra":["1.4T Enjoy","1.4T Sport","1.6T Sport"],"Mokka":["1.4T Enjoy","1.4T Cosmo","1.2T Elegance"]},
 "Peugeot":{"208":["1.2 Active","1.2 Allure","1.2 GT"],"2008":["1.2 Active","1.2 Allure","1.2 GT"],"3008":["1.6 THP Active","1.6 THP Allure","1.6 THP GT-Line"]},
 "Subaru":{"Forester":["2.0i","2.0i-L","2.0i-S","2.5 XS","2.5 XT"],"XV":["2.0i","2.0i-S","2.0i-L"],"Outback":["2.5i-S","3.6R-S"],"WRX":["2.0T","2.5 STI"]},
 "Volvo":{"XC40":["T3 Momentum","T4 Momentum","T5 R-Design","B3 Plus","Recharge"],"XC60":["D4 Momentum","D5 Inscription","T5 R-Design","B5 Plus"],"XC90":["D5 Momentum","D5 Inscription","T8 Recharge"]},
 "Jeep":{"Wrangler":["Sport","Sahara","Rubicon","Unlimited Sport","Unlimited Rubicon"],"Renegade":["1.4T Longitude","1.4T Limited","1.4T Trailhawk"],"Compass":["2.0 Longitude","2.4 Limited","1.4T Limited"]},
 "Land Rover":{"Defender":["90","110","130","D240","D300","P300","P400"],"Discovery Sport":["TD4 S","TD4 SE","D200 S","P250 R-Dynamic"],"Range Rover Evoque":["TD4 SE","D180 R-Dynamic","P200 S","P250 R-Dynamic"]},
 "MINI":{"Hatch":["Cooper","Cooper S","One","John Cooper Works"],"Countryman":["Cooper","Cooper S","Cooper D","Cooper SD","John Cooper Works"]},
 "Chery":{"Tiggo 4 Pro":["1.5 LiT","1.5 Urban","1.5 Comfort","1.5 Elite","1.5T Elite"],"Tiggo 7 Pro":["1.5T Distinction","1.5T Executive"],"Tiggo 8 Pro":["1.6 TGDI Distinction","1.6 TGDI Executive"]},
 "Haval":{"Jolion":["1.5T City","1.5T Premium","1.5T Luxury","1.5T Super Luxury","1.5 HEV"],"H6":["2.0T Premium","2.0T Luxury","2.0T Super Luxury","1.5 HEV"]},
 "GWM":{"P-Series":["2.0TD SX","2.0TD LS","2.0TD LT","2.0TD LTD"],"Steed 5":["2.2 MPi","2.0 VGT SX","2.0 VGT Xscape"]},
 "JAC":{"T8":["2.0 CTi Lux","2.0 CTi Super Lux"],"T9":["2.0 CTi Lux","2.0 CTi Super Lux"]},
 "Mitsubishi":{"Triton":["2.4 DI-D GL","2.4 DI-D GLS","2.4 DI-D Athlete"],"Pajero Sport":["2.4 DI-D 4x2","2.4 DI-D 4x4","2.4 DI-D Exceed"],"ASX":["2.0 GL","2.0 GLS","2.0 ES"]}
});
