#!/usr/bin/env python3
"""Exam-oriented article sections for the built-in current-affairs items (Hindi + English).
Facts come from each item's sourced record (data/news.json) plus well-established background.
Run from myquiz-app/: python3 tools/content/news_extra.py"""
import json, pathlib
X = {
'n2611-iffi': dict(
  details=('57वाँ भारतीय अंतरराष्ट्रीय फ़िल्म महोत्सव (IFFI) 20 से 28 नवंबर 2026 तक गोवा में हो रहा है। इस बार की थीम "Stories Without Borders" है। उद्घाटन फ़िल्म पोलिश निर्देशक पावेल पावलिकोव्स्की की "फ़ादरलैंड" है और स्पेन "कंट्री ऑफ़ ऑनर" है।',
           'The 57th International Film Festival of India (IFFI) is being held in Goa from 20 to 28 November 2026 with the theme "Stories Without Borders". The opening film is "Fatherland" by Polish director Paweł Pawlikowski, and Spain is the Country of Honour.'),
  why=('IFFI भारत का सबसे पुराना और सबसे बड़ा अंतरराष्ट्रीय फ़िल्म महोत्सव है। यह भारतीय सिनेमा को दुनिया के सामने रखता है और "कंट्री ऑफ़ ऑनर" के साथ सांस्कृतिक संबंध मज़बूत करता है।',
       'IFFI is India\'s oldest and biggest international film festival. It presents Indian cinema to the world and strengthens cultural ties with the Country of Honour.'),
  bg=('IFFI 1952 में शुरू हुआ और 2004 से गोवा इसका स्थायी स्थल है। इसका सर्वोच्च पुरस्कार "स्वर्ण मयूर" (Golden Peacock) है।',
      'IFFI began in 1952 and Goa has been its permanent venue since 2004. Its top award is the Golden Peacock.'),
  orgs=[('सूचना एवं प्रसारण मंत्रालय', 'Ministry of Information and Broadcasting'), ('एंटरटेनमेंट सोसाइटी ऑफ़ गोवा', 'Entertainment Society of Goa')],
  schemes=[]),
'n2611-h5n1': dict(
  details=('भोपाल स्थित ICAR-राष्ट्रीय उच्च सुरक्षा पशु रोग संस्थान (NIHSAD) ने मुर्गियों के लिए भारत का पहला स्वदेशी H5N1 बर्ड फ़्लू टीका विकसित किया है। यह क्लेड 2.3.2.1a के विरुद्ध निष्क्रिय टीका है; एक ख़ुराक लगभग छह महीने बचाती है और यह लेयर व ब्रीडर मुर्गियों के लिए है।',
           'ICAR-National Institute of High Security Animal Diseases (NIHSAD), Bhopal, has developed India\'s first indigenous H5N1 bird flu vaccine for chickens. It is an inactivated vaccine against clade 2.3.2.1a; one dose protects for about six months, and it is meant for layer and breeder chickens.'),
  why=('बर्ड फ़्लू फैलने पर बड़ी संख्या में मुर्गियाँ नष्ट करनी पड़ती हैं, जिससे किसानों को भारी नुक़सान होता है। स्वदेशी टीका इस नुक़सान और आयात पर निर्भरता को कम कर सकता है।',
       'Bird flu outbreaks force the culling of large numbers of birds, causing heavy losses to farmers. An indigenous vaccine can reduce these losses and dependence on imports.'),
  bg=('H5N1 अत्यधिक रोगजनक एवियन इन्फ़्लुएंज़ा वायरस है। भारत में बर्ड फ़्लू पहली बार 2006 में दर्ज हुआ था।',
      'H5N1 is a highly pathogenic avian influenza virus. Bird flu was first recorded in India in 2006.'),
  orgs=[('भारतीय कृषि अनुसंधान परिषद (ICAR)', 'Indian Council of Agricultural Research (ICAR)'), ('ICAR-NIHSAD, भोपाल', 'ICAR-NIHSAD, Bhopal'), ('कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture and Farmers Welfare')],
  schemes=[('पशुधन स्वास्थ्य एवं रोग नियंत्रण कार्यक्रम (LHDCP) — पशु रोगों के टीकाकरण और नियंत्रण के लिए', 'Livestock Health and Disease Control Programme (LHDCP) — vaccination and control of animal diseases')]),
'n2611-lakshya': dict(
  details=('लक्ष्य सेन ने BWF सुपर 500 कुमामोटो मास्टर्स जापान 2026 का पुरुष एकल ख़िताब जीता। फ़ाइनल में उन्होंने मेज़बान खिलाड़ी कोकी वतानाबे को 13-21, 21-18, 21-14 से हराया और यह ख़िताब जीतने वाले पहले भारतीय बने।',
           'Lakshya Sen won the men\'s singles title at the BWF Super 500 Kumamoto Masters Japan 2026. He beat home player Koki Watanabe 13-21, 21-18, 21-14 in the final to become the first Indian to win the title.'),
  why=('सुपर 500 ख़िताब से विश्व रैंकिंग के महत्वपूर्ण अंक मिलते हैं और बड़े टूर्नामेंटों से पहले आत्मविश्वास बढ़ता है।',
       'A Super 500 title brings valuable world-ranking points and a confidence boost ahead of major events.'),
  bg=('उत्तराखंड के अल्मोड़ा के लक्ष्य सेन ने 2021 विश्व चैंपियनशिप में कांस्य और 2022 राष्ट्रमंडल खेलों (बर्मिंघम) में पुरुष एकल स्वर्ण जीता था। कुमामोटो मास्टर्स 2023 से हो रहा है।',
      'Lakshya Sen, from Almora in Uttarakhand, won bronze at the 2021 World Championships and men\'s singles gold at the 2022 Commonwealth Games (Birmingham). The Kumamoto Masters has been held since 2023.'),
  orgs=[('बैडमिंटन विश्व महासंघ (BWF)', 'Badminton World Federation (BWF)'), ('भारतीय बैडमिंटन संघ (BAI)', 'Badminton Association of India (BAI)')],
  schemes=[('टारगेट ओलंपिक पोडियम स्कीम (TOPS) — शीर्ष खिलाड़ियों की ओलंपिक तैयारी में सहायता', 'Target Olympic Podium Scheme (TOPS) — support for top athletes preparing for the Olympics')]),
'n2611-cop31': dict(
  details=('संयुक्त राष्ट्र जलवायु परिवर्तन सम्मेलन COP31, 9 से 20 नवंबर 2026 तक तुर्किये के अंताल्या में हुआ। भारत ने विकसित देशों से पेरिस समझौते के तहत जलवायु वित्त की अपनी ज़िम्मेदारियाँ पूरी करने को कहा। सम्मेलन में एक अलग "जलवायु वित्त कार्य कार्यक्रम" अपनाया गया।',
           'The UN Climate Change Conference COP31 was held in Antalya, Türkiye, from 9 to 20 November 2026. India urged developed countries to meet their climate finance obligations under the Paris Agreement. The conference adopted a separate Climate Finance Work Programme.'),
  why=('जलवायु वित्त तय करता है कि विकासशील देश स्वच्छ ऊर्जा और जलवायु अनुकूलन का ख़र्च कैसे उठाएँगे। अलग कार्य कार्यक्रम से यह मुद्दा लगातार एजेंडे पर रहेगा।',
       'Climate finance decides how developing countries pay for clean energy and adaptation. A dedicated work programme keeps the issue on the agenda.'),
  bg=('COP, UNFCCC (1992, रियो पृथ्वी सम्मेलन) के पक्षकारों का वार्षिक सम्मेलन है। पेरिस समझौता (COP21, 2015) तापवृद्धि को 2°C से काफ़ी नीचे, और 1.5°C तक सीमित रखने का प्रयास करता है। भारत ने 2070 तक नेट ज़ीरो का लक्ष्य रखा है।',
      'COP is the annual Conference of the Parties to the UNFCCC (1992, Rio Earth Summit). The Paris Agreement (COP21, 2015) aims to keep warming well below 2°C while pursuing 1.5°C. India has set a net-zero target for 2070.'),
  orgs=[('जलवायु परिवर्तन पर संयुक्त राष्ट्र फ़्रेमवर्क कन्वेंशन (UNFCCC)', 'UN Framework Convention on Climate Change (UNFCCC)'), ('पर्यावरण, वन और जलवायु परिवर्तन मंत्रालय', 'Ministry of Environment, Forest and Climate Change')],
  schemes=[('जलवायु परिवर्तन पर राष्ट्रीय कार्य योजना (NAPCC, 2008) — 8 राष्ट्रीय मिशन', 'National Action Plan on Climate Change (NAPCC, 2008) — 8 national missions'), ('मिशन LiFE (पर्यावरण के लिए जीवनशैली)', 'Mission LiFE (Lifestyle for Environment)')]),
'n2611-isa': dict(
  details=('नई दिल्ली में भारत नवीकरणीय ऊर्जा शिखर सम्मेलन 2026 के दौरान हुई अंतरराष्ट्रीय सौर गठबंधन (ISA) सभा के 9वें सत्र में भारत लगातार तीसरी बार अध्यक्ष चुना गया और फ़्रांस सह-अध्यक्ष बना। यह घोषणा केंद्रीय नवीन एवं नवीकरणीय ऊर्जा मंत्री प्रल्हाद जोशी ने की।',
           'At the 9th session of the International Solar Alliance (ISA) Assembly, held during the Bharat Renewable Energy Summit 2026 in New Delhi, India was elected President for the third consecutive time and France became Co-President. Union Minister of New and Renewable Energy Pralhad Joshi announced it.'),
  why=('ISA सदस्य देशों को सौर ऊर्जा के लिए निवेश और तकनीक जुटाने में मदद करता है। भारत का नेतृत्व स्वच्छ ऊर्जा में उसकी वैश्विक भूमिका को मज़बूत करता है।',
       'The ISA helps member countries raise investment and technology for solar power. India\'s leadership strengthens its global role in clean energy.'),
  bg=('ISA 2015 में पेरिस (COP21) में भारत और फ़्रांस की पहल पर शुरू हुआ; इसका मुख्यालय गुरुग्राम (हरियाणा) में है। "वन सन, वन वर्ल्ड, वन ग्रिड" (OSOWOG) पहल देशों के बीच सौर ग्रिड जोड़ने की बात करती है।',
      'The ISA was launched in 2015 in Paris (COP21) as an India–France initiative and is headquartered in Gurugram (Haryana). The "One Sun, One World, One Grid" (OSOWOG) initiative aims to connect solar grids across countries.'),
  orgs=[('अंतरराष्ट्रीय सौर गठबंधन (ISA)', 'International Solar Alliance (ISA)'), ('नवीन एवं नवीकरणीय ऊर्जा मंत्रालय (MNRE)', 'Ministry of New and Renewable Energy (MNRE)')],
  schemes=[('राष्ट्रीय सौर मिशन (2010)', 'National Solar Mission (2010)'), ('पीएम सूर्य घर: मुफ़्त बिजली योजना (2024) — छत पर सौर पैनल', 'PM Surya Ghar: Muft Bijli Yojana (2024) — rooftop solar')]),
'n2610-nvs03': dict(
  details=('30 अक्टूबर 2026 को इसरो के GSLV-F18 ने श्रीहरिकोटा के दूसरे लॉन्च पैड से उड़ान भरी और NVS-03 उपग्रह को भू-तुल्यकाली स्थानांतरण कक्षा (GTO) में पहुँचाया। लगभग 2,232 किग्रा का यह उपग्रह L1, L5 और S बैंड में सिग्नल भेजेगा और NavIC को मज़बूत करेगा।',
           'On 30 October 2026 ISRO\'s GSLV-F18 lifted off from the second launch pad at Sriharikota and placed the NVS-03 satellite in a geosynchronous transfer orbit (GTO). The satellite, weighing about 2,232 kg, transmits in the L1, L5 and S bands and will strengthen NavIC.'),
  why=('पूरा NavIC तंत्र भारत को परिवहन, आपदा प्रबंधन और रक्षा के लिए अपनी सटीक स्थिति-निर्धारण सेवा देता है और विदेशी GPS पर निर्भरता घटाता है।',
       'A complete NavIC system gives India its own accurate positioning for transport, disaster management and defence, reducing dependence on foreign GPS.'),
  bg=('NavIC (पहले IRNSS) भारत का क्षेत्रीय नेविगेशन तंत्र है, जो भारत और उसकी सीमा से लगभग 1,500 किमी आगे तक कवर करता है। NVS श्रृंखला दूसरी पीढ़ी के उपग्रह हैं; NVS-01 (2023) में पहली बार स्वदेशी परमाणु घड़ी लगी थी।',
      'NavIC (formerly IRNSS) is India\'s regional navigation system, covering India and about 1,500 km beyond its borders. The NVS series are second-generation satellites; NVS-01 (2023) was the first to carry an indigenous atomic clock.'),
  orgs=[('भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO)', 'Indian Space Research Organisation (ISRO)'), ('सतीश धवन अंतरिक्ष केंद्र, श्रीहरिकोटा', 'Satish Dhawan Space Centre, Sriharikota')],
  schemes=[]),
'n2610-asiad': dict(
  details=('जापान के आइची-नागोया में 19 सितंबर से 4 अक्टूबर 2026 तक हुए 20वें एशियाई खेलों में भारत 85 पदकों (21 स्वर्ण, 27 रजत, 37 कांस्य) के साथ चौथे स्थान पर रहा। पुरुष हॉकी टीम ने फ़ाइनल में मलेशिया को 5-1 से हराकर स्वर्ण बरक़रार रखा।',
           'At the 20th Asian Games in Aichi-Nagoya, Japan (19 September–4 October 2026), India finished fourth with 85 medals (21 gold, 27 silver, 37 bronze). The men\'s hockey team beat Malaysia 5-1 in the final to retain its gold.'),
  why=('एशियाई खेल एशिया में भारत की खेल शक्ति का पैमाना हैं। तुलना के लिए: हांगझोउ (2022 खेल, 2023 में हुए) में भारत ने अब तक के सर्वाधिक 107 पदक (28 स्वर्ण) जीते थे।',
       'The Asian Games measure India\'s sporting strength in Asia. For comparison, at Hangzhou (the 2022 Games, held in 2023) India won its best-ever 107 medals, including 28 golds.'),
  bg=('एशियाई खेल हर चार साल में एशियाई ओलंपिक परिषद (OCA) कराती है। पहले एशियाई खेल 1951 में नई दिल्ली में हुए थे। अगले खेल 2030 में दोहा (क़तर) में होंगे।',
      'The Asian Games are held every four years by the Olympic Council of Asia (OCA). The first Asian Games were held in New Delhi in 1951. The next Games will be in Doha (Qatar) in 2030.'),
  orgs=[('एशियाई ओलंपिक परिषद (OCA)', 'Olympic Council of Asia (OCA)'), ('भारतीय ओलंपिक संघ (IOA)', 'Indian Olympic Association (IOA)'), ('भारतीय खेल प्राधिकरण (SAI)', 'Sports Authority of India (SAI)')],
  schemes=[('खेलो इंडिया', 'Khelo India'), ('टारगेट ओलंपिक पोडियम स्कीम (TOPS)', 'Target Olympic Podium Scheme (TOPS)')]),
'n2609-upgrad': dict(
  details=('एडटेक कंपनी upGrad ने 1 सितंबर 2026 को Unacademy समूह का पूरी तरह शेयर अदला-बदली (ऑल-स्टॉक) वाला अधिग्रहण पूरा किया। सौदा लगभग 20 करोड़ डॉलर का बताया गया और इसमें PrepLadder, Graphy और Airlearn शामिल हैं।',
           'Edtech company upGrad completed its all-stock acquisition of the Unacademy group on 1 September 2026. The deal was reported at about $200 million and includes PrepLadder, Graphy and Airlearn.'),
  why=('यह महामारी के बाद एडटेक क्षेत्र में आई सुस्ती और कंपनियों के एकीकरण (कंसोलिडेशन) को दिखाता है — सौदे का मूल्य 2021 के शिखर मूल्यांकन से लगभग 94% कम रहा।',
       'It shows the post-pandemic slowdown and consolidation in edtech — the deal value was about 94% below Unacademy\'s 2021 peak valuation.'),
  bg=('बड़े विलय और अधिग्रहण ("संयोजन") के लिए भारतीय प्रतिस्पर्धा आयोग (CCI) की मंज़ूरी ज़रूरी होती है; CCI ने इस सौदे को जुलाई 2026 में मंज़ूरी दी।',
      'Large mergers and acquisitions ("combinations") need approval from the Competition Commission of India (CCI); the CCI approved this deal in July 2026.'),
  orgs=[('भारतीय प्रतिस्पर्धा आयोग (CCI)', 'Competition Commission of India (CCI)')],
  schemes=[('प्रतिस्पर्धा अधिनियम, 2002', 'Competition Act, 2002')]),
}
p = pathlib.Path('data/news.json')
news = json.loads(p.read_text(encoding='utf-8'))
for n in news:
    x = X.get(n['id'])
    if not x: continue
    n['details'], n['en']['details'] = x['details']
    n['why'], n['en']['why'] = x['why']
    n['bg'], n['en']['bg'] = x['bg']
    n['orgs'] = [a for a, b in x['orgs']]; n['en']['orgs'] = [b for a, b in x['orgs']]
    n['schemes'] = [a for a, b in x['schemes']]; n['en']['schemes'] = [b for a, b in x['schemes']]
p.write_text('[\n' + ',\n'.join(json.dumps(n, ensure_ascii=False, separators=(',', ':')) for n in news) + '\n]\n', encoding='utf-8')
print('enriched', sum(1 for n in news if n['id'] in X), 'of', len(news))
