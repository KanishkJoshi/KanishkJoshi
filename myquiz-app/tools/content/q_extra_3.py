# Rich explanations for current-affairs questions. Facts come from the linked news records in
# data/news.json (each with a named source); wrong-option notes use well-established background only.
# The reference shown to learners for these questions is the linked news item's source.
NOT_THEME = ('यह IFFI 2026 की थीम नहीं है।', 'This is not the theme of IFFI 2026.')
X = {
'ca01': dict(
  why=['मुंबई में MAMI (मुंबई फ़िल्म महोत्सव) होता है, पर IFFI गोवा में होता है।', None, 'कोलकाता में कोलकाता अंतरराष्ट्रीय फ़िल्म महोत्सव (KIFF) होता है।', 'हैदराबाद रामोजी फ़िल्म सिटी के लिए प्रसिद्ध है, IFFI के लिए नहीं।'],
  why_en=['Mumbai hosts MAMI (the Mumbai Film Festival), but IFFI is held in Goa.', None, 'Kolkata hosts the Kolkata International Film Festival (KIFF).', 'Hyderabad is known for Ramoji Film City, not IFFI.'],
  ctx='IFFI 1952 में शुरू हुआ और 2004 से गोवा इसका स्थायी स्थल है। इसका आयोजन सूचना एवं प्रसारण मंत्रालय गोवा सरकार के साथ करता है।',
  ctx_en='IFFI began in 1952 and Goa has been its permanent venue since 2004. It is organised by the Ministry of Information and Broadcasting with the Goa government.'),
'ca02': dict(
  why=[None, NOT_THEME[0], '"वसुधैव कुटुंबकम्" भारत की G20 अध्यक्षता (2023) की थीम थी — "एक पृथ्वी, एक परिवार, एक भविष्य"।', NOT_THEME[0]],
  why_en=[None, NOT_THEME[1], '"Vasudhaiva Kutumbakam" was the theme of India\'s G20 presidency (2023) — "One Earth, One Family, One Future".', NOT_THEME[1]],
  ctx='उद्घाटन फ़िल्म पोलिश निर्देशक पावेल पावलिकोव्स्की की "फ़ादरलैंड" है और "कंट्री ऑफ़ ऑनर" स्पेन है।',
  ctx_en='The opening film is "Fatherland" by Polish director Paweł Pawlikowski, and the Country of Honour is Spain.'),
'ca03': dict(
  why=['ICMR का राष्ट्रीय विषाणु विज्ञान संस्थान (NIV) मुख्यतः मनुष्यों के वायरस रोगों पर काम करता है; यह मुर्गियों का टीका उसने नहीं बनाया।', None,
       'भारत बायोटेक ने कोवैक्सिन (कोविड-19) बनाई थी, यह टीका नहीं।', 'सीरम इंस्टिट्यूट ने कोविशील्ड (कोविड-19) बनाई थी; यह टीका उसका नहीं है।'],
  why_en=['ICMR\'s National Institute of Virology (NIV) works mainly on human viral diseases; it did not make this poultry vaccine.', None,
          'Bharat Biotech made Covaxin (COVID-19), not this vaccine.', 'The Serum Institute made Covishield (COVID-19); this vaccine is not theirs.'],
  ctx='NIHSAD, भारतीय कृषि अनुसंधान परिषद (ICAR) का संस्थान है जो पशुओं की ख़तरनाक बीमारियों पर उच्च-सुरक्षा प्रयोगशाला में काम करता है। भारत में बर्ड फ़्लू पहली बार 2006 में दर्ज हुआ था।',
  ctx_en='NIHSAD is an institute of the Indian Council of Agricultural Research (ICAR) that works on dangerous animal diseases in a high-security laboratory. Bird flu was first recorded in India in 2006.'),
'ca04': dict(
  why=['बहुत कम — आधिकारिक जानकारी के अनुसार एक ख़ुराक लगभग छह महीने बचाती है।', 'बहुत कम — एक ख़ुराक लगभग छह महीने तक सुरक्षा देती है।', None, 'बहुत अधिक — सुरक्षा लगभग छह महीने की है, दो साल की नहीं।'],
  why_en=['Too short — official information says one dose protects for about six months.', 'Too short — one dose protects for about six months.', None, 'Too long — protection lasts about six months, not two years.'],
  ctx='यह क्लेड 2.3.2.1a के विरुद्ध एक निष्क्रिय (इनऐक्टिवेटेड) टीका है, जो अंडा देने वाली (लेयर) और प्रजनन (ब्रीडर) मुर्गियों के लिए है।',
  ctx_en='It is an inactivated vaccine against clade 2.3.2.1a, meant for layer and breeder chickens.'),
'ca05': dict(
  why=['किदांबी श्रीकांत 2018 में विश्व नंबर 1 बनने वाले पहले भारतीय पुरुष बैडमिंटन खिलाड़ी हैं।', None, 'एच.एस. प्रणय ने 2023 विश्व चैंपियनशिप में कांस्य पदक जीता।', 'प्रियांशु राजावत ने 2023 में ऑरलियन्स मास्टर्स (सुपर 300) जीता।'],
  why_en=['Kidambi Srikanth became the first Indian man to reach world No. 1 in badminton (2018).', None, 'H.S. Prannoy won bronze at the 2023 World Championships.', 'Priyanshu Rajawat won the 2023 Orléans Masters (Super 300).'],
  ctx='लक्ष्य सेन उत्तराखंड के अल्मोड़ा से हैं; उन्होंने 2021 विश्व चैंपियनशिप में कांस्य पदक जीता था।',
  ctx_en='Lakshya Sen is from Almora, Uttarakhand; he won bronze at the 2021 World Championships.'),
'ca06': dict(
  why=['सुपर 300 निचला स्तर है (जैसे सैयद मोदी इंटरनेशनल)।', None, 'सुपर 750 में इंडिया ओपन (नई दिल्ली) जैसे टूर्नामेंट आते हैं।', 'सुपर 1000 सबसे ऊँचा स्तर है: ऑल इंग्लैंड, इंडोनेशिया ओपन, चाइना ओपन और मलेशिया ओपन।'],
  why_en=['Super 300 is a lower tier (for example, the Syed Modi International).', None, 'Super 750 includes events such as the India Open (New Delhi).', 'Super 1000 is the top tier: All England, Indonesia Open, China Open and Malaysia Open.'],
  ctx='BWF वर्ल्ड टूर के स्तर (ऊपर से नीचे): फ़ाइनल्स, सुपर 1000, 750, 500, 300 और 100।',
  ctx_en='BWF World Tour tiers (top to bottom): Finals, Super 1000, 750, 500, 300 and 100.'),
'ca07': dict(
  why=['ब्राज़ील ने COP30 की मेज़बानी बेलेम में (2025) की।', None, 'अज़रबैजान ने COP29 की मेज़बानी बाकू में (2024) की।', 'संयुक्त अरब अमीरात ने COP28 की मेज़बानी दुबई में (2023) की।'],
  why_en=['Brazil hosted COP30 in Belém (2025).', None, 'Azerbaijan hosted COP29 in Baku (2024).', 'The UAE hosted COP28 in Dubai (2023).'],
  ctx='COP का अर्थ है UNFCCC के पक्षकारों का सम्मेलन। UNFCCC 1992 के रियो पृथ्वी सम्मेलन में अपनाया गया और पेरिस समझौता COP21 (2015) में हुआ।',
  ctx_en='COP means the Conference of the Parties to the UNFCCC. The UNFCCC was adopted at the 1992 Rio Earth Summit, and the Paris Agreement was agreed at COP21 (2015).'),
'ca08': dict(
  why=[None, 'कोयला प्रतिबंध की कोई संधि नहीं हुई; COP26 (ग्लासगो) में बिना नियंत्रण वाली कोयला बिजली को "चरणबद्ध रूप से कम" करने पर सहमति बनी थी।',
       'कार्बन सीमा कर (जैसे यूरोपीय संघ का CBAM) का भारत विरोध करता है; यह COP31 का निर्णय नहीं है।', 'COP31 में अलग कार्यक्रम जलवायु वित्त पर अपनाया गया, वन कोष पर नहीं।'],
  why_en=[None, 'No coal ban treaty was adopted; at COP26 (Glasgow) countries agreed to "phase down" unabated coal power.',
          'A carbon border tax (such as the EU\'s CBAM) is opposed by India and was not a COP31 decision.', 'The separate programme adopted at COP31 was on climate finance, not a forest fund.'],
  ctx='भारत की प्राथमिकताएँ: अनुमानित (भरोसेमंद) जलवायु वित्त, प्रौद्योगिकी हस्तांतरण और न्यायसंगत बदलाव (just transition)।',
  ctx_en='India\'s priorities: predictable climate finance, technology transfer and a just transition.'),
'ca09': dict(
  why=['दूसरी बार नहीं — यह लगातार तीसरा कार्यकाल है।', None, 'चौथी बार नहीं — भारत लगातार तीसरी बार अध्यक्ष चुना गया।', 'पहली बार नहीं — भारत इससे पहले भी दो बार अध्यक्ष रह चुका है।'],
  why_en=['Not the second — this is India\'s third consecutive term.', None, 'Not the fourth — India was elected for the third consecutive time.', 'Not the first — India had already been President twice before.'],
  ctx='ISA 2015 में पेरिस (COP21) में भारत और फ़्रांस की पहल पर शुरू हुआ। इस बार फ़्रांस सह-अध्यक्ष चुना गया।',
  ctx_en='The ISA was launched in 2015 in Paris (COP21) as an India–France initiative. France was elected Co-President this time.'),
'ca10': dict(
  why=['ISA की शुरुआत पेरिस (COP21, 2015) में हुई, पर इसका मुख्यालय भारत में है।', None, 'ISA सभा की बैठक नई दिल्ली में हुई, पर मुख्यालय गुरुग्राम (हरियाणा) में है।', 'जिनेवा में कई UN संस्थाएँ हैं, ISA नहीं।'],
  why_en=['The ISA was launched in Paris (COP21, 2015), but its headquarters is in India.', None, 'The ISA Assembly met in New Delhi, but the headquarters is in Gurugram (Haryana).', 'Geneva hosts many UN bodies, but not the ISA.'],
  ctx='ISA संधि-आधारित अंतरराष्ट्रीय संगठन है; इसका लक्ष्य सौर ऊर्जा को सस्ता और सुलभ बनाना है।',
  ctx_en='The ISA is a treaty-based international organisation that aims to make solar energy affordable and widely available.'),
'ca11': dict(
  why=['PSLV मुख्यतः उपग्रहों को निचली (सूर्य-तुल्यकाली) कक्षाओं में भेजता है।', None, 'LVM3 इसरो का सबसे भारी रॉकेट है (चंद्रयान-3 इसी से गया)।', 'SSLV छोटे उपग्रहों का प्रक्षेपण यान है; SSLV-D3 ने 2024 में EOS-08 को भेजा।'],
  why_en=['PSLV mainly places satellites in lower (sun-synchronous) orbits.', None, 'LVM3 is ISRO\'s heaviest rocket (it launched Chandrayaan-3).', 'SSLV is the small satellite launch vehicle; SSLV-D3 launched EOS-08 in 2024.'],
  ctx='GSLV-F18, GSLV की 20वीं उड़ान थी। इसने श्रीहरिकोटा के दूसरे लॉन्च पैड से उड़ान भरी और NVS-03 को भू-तुल्यकाली स्थानांतरण कक्षा (GTO) में पहुँचाया।',
  ctx_en='GSLV-F18 was the 20th GSLV flight. It lifted off from the second launch pad at Sriharikota and placed NVS-03 in a geosynchronous transfer orbit (GTO).'),
'ca12': dict(
  why=[None, 'गगनयान भारत का मानव अंतरिक्ष उड़ान कार्यक्रम है।', 'INSAT-3D श्रृंखला मौसम संबंधी उपग्रहों की है।', 'GSAT उपग्रह संचार सेवाएँ देते हैं।'],
  why_en=[None, 'Gaganyaan is India\'s human spaceflight programme.', 'The INSAT-3D series are weather satellites.', 'GSAT satellites provide communication services.'],
  ctx='NavIC भारत और उसकी सीमा से लगभग 1,500 किमी आगे तक का क्षेत्र कवर करता है। NVS-03 का वज़न लगभग 2,232 किग्रा है और यह L1, L5 और S बैंड में सिग्नल भेजता है।',
  ctx_en='NavIC covers India and about 1,500 km beyond its borders. NVS-03 weighs about 2,232 kg and transmits in the L1, L5 and S bands.'),
'ca13': dict(
  why=['तीसरा नहीं — भारत 85 पदकों के साथ चौथे स्थान पर रहा।', None, 'पाँचवाँ नहीं — भारत चौथे स्थान पर रहा (21 स्वर्ण, 27 रजत, 37 कांस्य)।', 'छठा नहीं — भारत चौथे स्थान पर रहा।'],
  why_en=['Not third — India finished fourth with 85 medals.', None, 'Not fifth — India finished fourth (21 gold, 27 silver, 37 bronze).', 'Not sixth — India finished fourth.'],
  ctx='पदक तालिका में चीन शीर्ष पर रहा। अगले एशियाई खेल 2030 में दोहा (क़तर) में होंगे।',
  ctx_en='China topped the medal table. The next Asian Games will be held in Doha (Qatar) in 2030.'),
'ca14': dict(
  why=['फ़ाइनल में भारत का मुक़ाबला मलेशिया से था, पाकिस्तान से नहीं।', None, 'जापान मेज़बान देश था; फ़ाइनल भारत और मलेशिया के बीच हुआ।', 'फ़ाइनल में भारत ने मलेशिया को हराया, दक्षिण कोरिया को नहीं।'],
  why_en=['India\'s opponent in the final was Malaysia, not Pakistan.', None, 'Japan was the host nation; the final was India vs Malaysia.', 'India beat Malaysia in the final, not South Korea.'],
  ctx='भारत ने हांगझोउ (2022 खेल, जो 2023 में हुए) में फ़ाइनल में जापान को 5–1 से हराकर ख़िताब जीता था और इस बार उसे बचाए रखा।',
  ctx_en='India had won the title at Hangzhou (the 2022 Games, held in 2023), beating Japan 5–1 in the final, and retained it this time.'),
'ca15': dict(
  why=['BYJU\'S पर दिवालियापन की कार्यवाही चली है; वह इस सौदे का हिस्सा नहीं थी।', None, 'वेदांतु एक अलग ऑनलाइन ट्यूशन कंपनी है; यह सौदे में शामिल नहीं थी।', 'टेस्टबुक एक अलग टेस्ट-तैयारी प्लेटफ़ॉर्म है।'],
  why_en=['BYJU\'S has faced insolvency proceedings; it was not part of this deal.', None, 'Vedantu is a separate online tutoring company and was not part of the deal.', 'Testbook is a separate test-preparation platform.'],
  ctx='यह पूरी तरह शेयर अदला-बदली (ऑल-स्टॉक) वाला सौदा था, जिसकी क़ीमत लगभग 20 करोड़ डॉलर बताई गई — 2021 के शिखर मूल्यांकन से लगभग 94% कम। प्रतिस्पर्धा आयोग (CCI) ने जुलाई 2026 में इसे मंज़ूरी दी।',
  ctx_en='It was an all-stock (100% share swap) deal reported at about $200 million — roughly 94% below the 2021 peak valuation. The Competition Commission of India (CCI) approved it in July 2026.'),
}
