// Banco de Dados Geográfico Offline Completo de Cidades, Bairros, Rodovias e Pontos de Interesse (POIs) do Estado do Rio de Janeiro e Brasil
// Permite busca e autocompletar instantâneo mesmo sem internet (100% Offline e Cache Local)

export interface GeocodedLocation {
  id: string;
  name: string;
  display_name: string;
  category: 'cidade' | 'bairro' | 'rodovia' | 'poi' | 'praia' | 'posto' | 'hospital' | 'aeroporto';
  lat: number;
  lng: number;
  keywords: string[];
}

export const BRAZIL_OFFLINE_GEO_DB: GeocodedLocation[] = [
  // ─── MARICÁ & REGIÃO (Base de Referência Principal) ───
  {
    id: 'rj-marica-centro',
    name: 'Maricá (Centro)',
    display_name: 'Centro, Maricá - RJ, Brasil',
    category: 'cidade',
    lat: -22.9194,
    lng: -42.8186,
    keywords: ['marica', 'maricá', 'centro marica', 'prefeitura marica', 'praca orlando de barros'],
  },
  {
    id: 'rj-marica-itaipuacu',
    name: 'Itaipuaçu (Maricá)',
    display_name: 'Itaipuaçu, Maricá - RJ, Brasil',
    category: 'bairro',
    lat: -22.9556,
    lng: -42.9889,
    keywords: ['itaipuacu', 'itaipuaçu', 'praia de itaipuacu', 'barroco', 'rua um', 'marica itaipuacu'],
  },
  {
    id: 'rj-marica-ponta-negra',
    name: 'Praia de Ponta Negra (Maricá)',
    display_name: 'Praia de Ponta Negra, Maricá - RJ, Brasil',
    category: 'praia',
    lat: -22.9639,
    lng: -42.6908,
    keywords: ['ponta negra', 'praia de ponta negra', 'farol de ponta negra', 'marica ponta negra'],
  },
  {
    id: 'rj-marica-cordeirinho',
    name: 'Cordeirinho (Maricá)',
    display_name: 'Cordeirinho, Maricá - RJ, Brasil',
    category: 'bairro',
    lat: -22.9602,
    lng: -42.7481,
    keywords: ['cordeirinho', 'praia de cordeirinho', 'marica'],
  },
  {
    id: 'rj-marica-barrademarica',
    name: 'Barra de Maricá',
    display_name: 'Barra de Maricá, Maricá - RJ, Brasil',
    category: 'bairro',
    lat: -22.9647,
    lng: -42.8094,
    keywords: ['barra de marica', 'barra de maricá', 'praia da barra'],
  },
  {
    id: 'rj-marica-inoa',
    name: 'Inoã (Maricá)',
    display_name: 'Inoã, Maricá - RJ, Brasil',
    category: 'bairro',
    lat: -22.9231,
    lng: -42.9242,
    keywords: ['inoa', 'inoã', 'rj-106 inoa', 'passarela de inoa', 'marica'],
  },
  {
    id: 'rj-marica-sao-jose',
    name: 'São José do Imbassaí (Maricá)',
    display_name: 'São José do Imbassaí, Maricá - RJ, Brasil',
    category: 'bairro',
    lat: -22.9242,
    lng: -42.8805,
    keywords: ['sao jose', 'são josé do imbassaí', 'hospital che guevara', 'marica'],
  },
  {
    id: 'rj-marica-guaratiba',
    name: 'Guaratiba (Maricá)',
    display_name: 'Guaratiba, Maricá - RJ, Brasil',
    category: 'bairro',
    lat: -22.9620,
    lng: -42.7800,
    keywords: ['guaratiba', 'praia de guaratiba', 'marica'],
  },
  {
    id: 'rj-marica-jacone',
    name: 'Jaconé (Maricá / Saquarema)',
    display_name: 'Jaconé, Maricá / Saquarema - RJ, Brasil',
    category: 'bairro',
    lat: -22.9430,
    lng: -42.6320,
    keywords: ['jacone', 'jaconé', 'praia de jacone', 'marica saquarema'],
  },
  {
    id: 'rj-marica-posto-br',
    name: 'Posto Petrobras BR (RJ-106 Maricá)',
    display_name: 'Posto Petrobras BR, Rodovia Amaral Peixoto (RJ-106), Maricá - RJ',
    category: 'posto',
    lat: -22.9205,
    lng: -42.8250,
    keywords: ['posto br', 'posto petrobras', 'posto marica', 'posto rj-106', 'gasolina gnv marica'],
  },
  {
    id: 'rj-marica-posto-ipiranga',
    name: 'Posto Ipiranga (Inoã RJ-106)',
    display_name: 'Posto Ipiranga, Inoã, RJ-106, Maricá - RJ',
    category: 'posto',
    lat: -22.9238,
    lng: -42.9210,
    keywords: ['posto ipiranga', 'posto inoa', 'ipiranga rj 106'],
  },
  {
    id: 'rj-marica-hospital-che-guevara',
    name: 'Hospital Municipal Dr. Ernesto Che Guevara',
    display_name: 'Hospital Dr. Ernesto Che Guevara, Rod. Amaral Peixoto km 23, Maricá - RJ',
    category: 'hospital',
    lat: -22.9248,
    lng: -42.8790,
    keywords: ['hospital', 'hospital che guevara', 'hospital de marica', 'upa marica', 'emergencia'],
  },

  // ─── NITERÓI & REGIÃO OCEÂNICA ───
  {
    id: 'rj-niteroi-centro',
    name: 'Niterói (Centro)',
    display_name: 'Centro, Niterói - RJ, Brasil',
    category: 'cidade',
    lat: -22.8859,
    lng: -43.1153,
    keywords: ['niteroi', 'niterói', 'centro niteroi', 'barcas niteroi', 'terminal rodoviario niteroi'],
  },
  {
    id: 'rj-niteroi-icarai',
    name: 'Praia de Icaraí (Niterói)',
    display_name: 'Praia de Icaraí, Niterói - RJ, Brasil',
    category: 'praia',
    lat: -22.9056,
    lng: -43.1128,
    keywords: ['icarai', 'icaraí', 'praia de icarai', 'calçadao de icarai', 'moreira cesar'],
  },
  {
    id: 'rj-niteroi-itaipu',
    name: 'Praia de Itaipu (Niterói)',
    display_name: 'Praia de Itaipu, Região Oceânica, Niterói - RJ',
    category: 'praia',
    lat: -22.9722,
    lng: -43.0458,
    keywords: ['itaipu', 'praia de itaipu', 'regiao oceanica niteroi', 'lagoa de itaipu'],
  },
  {
    id: 'rj-niteroi-itacoatiara',
    name: 'Praia de Itacoatiara (Niterói)',
    display_name: 'Praia de Itacoatiara, Niterói - RJ, Brasil',
    category: 'praia',
    lat: -22.9767,
    lng: -43.0317,
    keywords: ['itacoatiara', 'praia de itacoatiara', 'costao de itacoatiara', 'surf itacoatiara'],
  },
  {
    id: 'rj-niteroi-camboinhas',
    name: 'Praia de Camboinhas (Niterói)',
    display_name: 'Praia de Camboinhas, Niterói - RJ, Brasil',
    category: 'praia',
    lat: -22.9667,
    lng: -43.0667,
    keywords: ['camboinhas', 'praia de camboinhas', 'quiosques camboinhas'],
  },
  {
    id: 'rj-niteroi-piratininga',
    name: 'Praia de Piratininga (Niterói)',
    display_name: 'Praia de Piratininga, Niterói - RJ, Brasil',
    category: 'praia',
    lat: -22.9525,
    lng: -43.0850,
    keywords: ['piratininga', 'praia de piratininga', 'tibau'],
  },
  {
    id: 'rj-niteroi-charitas',
    name: 'Charitas / São Francisco (Niterói)',
    display_name: 'Charitas / São Francisco, Niterói - RJ',
    category: 'bairro',
    lat: -22.9286,
    lng: -43.0986,
    keywords: ['charitas', 'catamara charitas', 'sao francisco', 'parque da cidade niteroi'],
  },
  {
    id: 'rj-niteroi-plaza-shopping',
    name: 'Plaza Shopping Niterói',
    display_name: 'Plaza Shopping, Rua XV de Novembro 8, Niterói - RJ',
    category: 'poi',
    lat: -22.8942,
    lng: -43.1236,
    keywords: ['plaza shopping', 'shopping niteroi', 'plaza', 'cinema plaza'],
  },
  {
    id: 'rj-niteroi-ponte',
    name: 'Ponte Rio-Niterói (Pedágio)',
    display_name: 'Pedágio Ponte Rio-Niterói (BR-101), Niterói - RJ',
    category: 'rodovia',
    lat: -22.8750,
    lng: -43.1300,
    keywords: ['ponte rio niteroi', 'pedagio ponte', 'ponte', 'br 101 ponte'],
  },

  // ─── RIO DE JANEIRO (CAPITAL) ───
  {
    id: 'rj-rio-centro',
    name: 'Rio de Janeiro (Centro)',
    display_name: 'Centro, Rio de Janeiro - RJ, Brasil',
    category: 'cidade',
    lat: -22.9068,
    lng: -43.1729,
    keywords: ['rio de janeiro', 'rio', 'centro rj', 'candelaria', 'cinelandia', 'praca xv'],
  },
  {
    id: 'rj-rio-copacabana',
    name: 'Praia de Copacabana (Rio de Janeiro)',
    display_name: 'Praia de Copacabana, Rio de Janeiro - RJ, Brasil',
    category: 'praia',
    lat: -22.9711,
    lng: -43.1822,
    keywords: ['copacabana', 'praia de copacabana', 'posto 6', 'copacabana palace', 'avenida atlantica'],
  },
  {
    id: 'rj-rio-ipanema',
    name: 'Praia de Ipanema (Rio de Janeiro)',
    display_name: 'Praia de Ipanema, Rio de Janeiro - RJ, Brasil',
    category: 'praia',
    lat: -22.9868,
    lng: -43.2003,
    keywords: ['ipanema', 'praia de ipanema', 'posto 9', 'arpoador', 'garota de ipanema'],
  },
  {
    id: 'rj-rio-barra',
    name: 'Barra da Tijuca (Rio de Janeiro)',
    display_name: 'Barra da Tijuca, Rio de Janeiro - RJ, Brasil',
    category: 'bairro',
    lat: -23.0003,
    lng: -43.3658,
    keywords: ['barra', 'barra da tijuca', 'praia da barra', 'barra shopping', 'av das americas'],
  },
  {
    id: 'rj-rio-recreio',
    name: 'Recreio dos Bandeirantes (Rio de Janeiro)',
    display_name: 'Recreio dos Bandeirantes, Rio de Janeiro - RJ, Brasil',
    category: 'bairro',
    lat: -23.0189,
    lng: -43.4633,
    keywords: ['recreio', 'recreio dos bandeirantes', 'posto 12', 'praia do recreio', 'praia do pontal'],
  },
  {
    id: 'rj-rio-cristo-redentor',
    name: 'Cristo Redentor (Corcovado)',
    display_name: 'Cristo Redentor, Parque Nacional da Tijuca, Rio de Janeiro - RJ',
    category: 'poi',
    lat: -22.9519,
    lng: -43.2105,
    keywords: ['cristo redentor', 'corcovado', 'cristo', 'estatua cristo'],
  },
  {
    id: 'rj-rio-pao-de-acucar',
    name: 'Pão de Açúcar (Bondinho)',
    display_name: 'Pão de Açúcar / Bondinho, Urca, Rio de Janeiro - RJ',
    category: 'poi',
    lat: -22.9492,
    lng: -43.1545,
    keywords: ['pao de acucar', 'pão de açúcar', 'bondinho', 'urca', 'praia vermelha'],
  },
  {
    id: 'rj-rio-maracana',
    name: 'Estádio do Maracanã',
    display_name: 'Estádio Jornalista Mário Filho (Maracanã), Rio de Janeiro - RJ',
    category: 'poi',
    lat: -22.9122,
    lng: -43.2302,
    keywords: ['maracana', 'maracanã', 'estadio maracana', 'flamengo', 'fluminense'],
  },
  {
    id: 'rj-rio-santos-dumont',
    name: 'Aeroporto Santos Dumont (SDU)',
    display_name: 'Aeroporto Santos Dumont (SDU), Praça Senador Salgado Filho, Rio de Janeiro - RJ',
    category: 'aeroporto',
    lat: -22.9105,
    lng: -43.1631,
    keywords: ['aeroporto santos dumont', 'santos dumont', 'sdu', 'aeroporto rio'],
  },
  {
    id: 'rj-rio-galeao',
    name: 'Aeroporto Internacional do Galeão (GIG - Tom Jobim)',
    display_name: 'Aeroporto Internacional Tom Jobim (Galeão), Ilha do Governador, Rio de Janeiro - RJ',
    category: 'aeroporto',
    lat: -22.8089,
    lng: -43.2436,
    keywords: ['aeroporto do galeao', 'galeao', 'galeão', 'gig', 'tom jobim'],
  },
  {
    id: 'rj-rio-rodoviaria-novorio',
    name: 'Rodoviária Novo Rio',
    display_name: 'Rodoviária do Rio (Novo Rio), Santo Cristo, Rio de Janeiro - RJ',
    category: 'poi',
    lat: -22.8986,
    lng: -43.2097,
    keywords: ['rodoviaria novo rio', 'rodoviaria do rio', 'rodoviaria', 'terminal rodoviario'],
  },
  {
    id: 'rj-rio-leblon',
    name: 'Praia do Leblon',
    display_name: 'Praia do Leblon, Rio de Janeiro - RJ, Brasil',
    category: 'praia',
    lat: -22.9847,
    lng: -43.2239,
    keywords: ['leblon', 'praia do leblon', 'mirante do leblon'],
  },
  {
    id: 'rj-rio-botafogo',
    name: 'Botafogo / Enseada de Botafogo',
    display_name: 'Botafogo, Rio de Janeiro - RJ, Brasil',
    category: 'bairro',
    lat: -22.9511,
    lng: -43.1806,
    keywords: ['botafogo', 'botafogo praia shopping', 'enseada de botafogo'],
  },
  {
    id: 'rj-rio-flamengo',
    name: 'Aterro do Flamengo',
    display_name: 'Parque Brigadeiro Eduardo Gomes (Aterro do Flamengo), Rio de Janeiro - RJ',
    category: 'poi',
    lat: -22.9300,
    lng: -43.1750,
    keywords: ['flamengo', 'aterro do flamengo', 'praia do flamengo'],
  },
  {
    id: 'rj-rio-tijuca',
    name: 'Tijuca / Praça Saens Peña',
    display_name: 'Tijuca, Rio de Janeiro - RJ, Brasil',
    category: 'bairro',
    lat: -22.9247,
    lng: -43.2325,
    keywords: ['tijuca', 'saens pena', 'praca saens pena', 'shopping tijuca'],
  },

  // ─── REGIÃO DOS LAGOS ───
  {
    id: 'rj-saquarema',
    name: 'Saquarema (Centro / Praia da Vila)',
    display_name: 'Saquarema - RJ, Brasil',
    category: 'cidade',
    lat: -22.9333,
    lng: -42.5100,
    keywords: ['saquarema', 'praia de saquarema', 'igreja nossa senhora de nazareth', 'itauna', 'praia de itauna'],
  },
  {
    id: 'rj-araruama',
    name: 'Araruama (Centro)',
    display_name: 'Araruama - RJ, Brasil',
    category: 'cidade',
    lat: -22.8728,
    lng: -42.3431,
    keywords: ['araruama', 'lagoa de araruama', 'centro araruama', 'praia do hospicio'],
  },
  {
    id: 'rj-iguaba',
    name: 'Iguaba Grande',
    display_name: 'Iguaba Grande - RJ, Brasil',
    category: 'cidade',
    lat: -22.8417,
    lng: -42.1833,
    keywords: ['iguaba grande', 'iguaba', 'lagoa de iguaba'],
  },
  {
    id: 'rj-sao-pedro-da-aldeia',
    name: 'São Pedro da Aldeia',
    display_name: 'São Pedro da Aldeia - RJ, Brasil',
    category: 'cidade',
    lat: -22.8411,
    lng: -42.1039,
    keywords: ['sao pedro da aldeia', 'são pedro da aldeia', 'base aerea sao pedro'],
  },
  {
    id: 'rj-cabo-frio',
    name: 'Cabo Frio (Praia do Forte)',
    display_name: 'Praia do Forte, Cabo Frio - RJ, Brasil',
    category: 'praia',
    lat: -22.8800,
    lng: -42.0200,
    keywords: ['cabo frio', 'praia do forte', 'forte sao mateus', 'rua dos biquinis cabo frio', 'perypery'],
  },
  {
    id: 'rj-arraial-do-cabo',
    name: 'Arraial do Cabo (Praia Grande / Prainha)',
    display_name: 'Arraial do Cabo - RJ, Brasil',
    category: 'cidade',
    lat: -22.9661,
    lng: -42.0278,
    keywords: ['arraial do cabo', 'arraial', 'prainha arraial', 'praia do forno', 'pontal do atalaia'],
  },
  {
    id: 'rj-buzios',
    name: 'Armação dos Búzios (Rua das Pedras / Geribá)',
    display_name: 'Armação dos Búzios - RJ, Brasil',
    category: 'cidade',
    lat: -22.7564,
    lng: -41.8889,
    keywords: ['buzios', 'búzios', 'rua das pedras', 'geriba', 'praia de geriba', 'joao fernandes'],
  },
  {
    id: 'rj-macae',
    name: 'Macaé (Centro / Praia dos Cavaleiros)',
    display_name: 'Macaé - RJ, Brasil',
    category: 'cidade',
    lat: -22.3769,
    lng: -41.7869,
    keywords: ['macae', 'macaé', 'praia dos cavaleiros', 'imbetiba', 'polo offshore macae'],
  },
  {
    id: 'rj-campos',
    name: 'Campos dos Goytacazes',
    display_name: 'Campos dos Goytacazes - RJ, Brasil',
    category: 'cidade',
    lat: -21.7544,
    lng: -41.3244,
    keywords: ['campos dos goytacazes', 'campos', 'norte fluminense'],
  },

  // ─── REGIÃO SERRANA & INTERIOR DO RJ ───
  {
    id: 'rj-petropolis',
    name: 'Petrópolis (Centro Histórico)',
    display_name: 'Petrópolis - RJ, Brasil',
    category: 'cidade',
    lat: -22.5050,
    lng: -43.1789,
    keywords: ['petropolis', 'petrópolis', 'museu imperial', 'itaipava', 'palacio de cristal'],
  },
  {
    id: 'rj-teresopolis',
    name: 'Teresópolis (Dedo de Deus)',
    display_name: 'Teresópolis - RJ, Brasil',
    category: 'cidade',
    lat: -22.4122,
    lng: -42.9656,
    keywords: ['teresopolis', 'teresópolis', 'dedo de deus', 'feirinha do alto', 'parnaso'],
  },
  {
    id: 'rj-nova-friburgo',
    name: 'Nova Friburgo',
    display_name: 'Nova Friburgo - RJ, Brasil',
    category: 'cidade',
    lat: -22.2819,
    lng: -42.5311,
    keywords: ['nova friburgo', 'friburgo', 'conego', 'olaria friburgo'],
  },

  // ─── SÃO GONÇALO, ITABORAI & BAIXADA FLUMINENSE ───
  {
    id: 'rj-sao-goncalo',
    name: 'São Gonçalo (Centro / Alcântara)',
    display_name: 'São Gonçalo - RJ, Brasil',
    category: 'cidade',
    lat: -22.8269,
    lng: -43.0539,
    keywords: ['sao goncalo', 'são gonçalo', 'alcantara', 'alcântara', 'shopping sao goncalo'],
  },
  {
    id: 'rj-itaborai',
    name: 'Itaboraí (Centro / Manilha)',
    display_name: 'Itaboraí - RJ, Brasil',
    category: 'cidade',
    lat: -22.7444,
    lng: -42.8597,
    keywords: ['itaborai', 'itaboraí', 'manilha', 'polo comperj itaborai'],
  },
  {
    id: 'rj-duque-de-caxias',
    name: 'Duque de Caxias',
    display_name: 'Duque de Caxias - RJ, Brasil',
    category: 'cidade',
    lat: -22.7858,
    lng: -43.3117,
    keywords: ['duque de caxias', 'caxias', 'redutores caxias', 'redur'],
  },
  {
    id: 'rj-nova-iguacu',
    name: 'Nova Iguaçu',
    display_name: 'Nova Iguaçu - RJ, Brasil',
    category: 'cidade',
    lat: -22.7558,
    lng: -43.4603,
    keywords: ['nova iguacu', 'nova iguaçu', 'top shopping nova iguacu'],
  },

  // ─── COSTA VERDE & SUL FLUMINENSE ───
  {
    id: 'rj-angra-dos-reis',
    name: 'Angra dos Reis (Porto / Ilha Grande)',
    display_name: 'Angra dos Reis - RJ, Brasil',
    category: 'cidade',
    lat: -23.0067,
    lng: -44.3181,
    keywords: ['angra dos reis', 'angra', 'ilha grande', 'marinas angra', 'br 101 sul'],
  },
  {
    id: 'rj-paraty',
    name: 'Paraty (Centro Histórico)',
    display_name: 'Paraty - RJ, Brasil',
    category: 'cidade',
    lat: -23.2178,
    lng: -44.7131,
    keywords: ['paraty', 'centro historico de paraty', 'cais de paraty', 'trindade'],
  },
  {
    id: 'rj-volta-redonda',
    name: 'Volta Redonda',
    display_name: 'Volta Redonda - RJ, Brasil',
    category: 'cidade',
    lat: -22.5231,
    lng: -44.1042,
    keywords: ['volta redonda', 'csn volta redonda', 'vila santa cecilia'],
  },
  {
    id: 'rj-resende',
    name: 'Resende (Penedo / Itatiaia)',
    display_name: 'Resende - RJ, Brasil',
    category: 'cidade',
    lat: -22.4689,
    lng: -44.4467,
    keywords: ['resende', 'penedo', 'itatiaia', 'aman resende'],
  },

  // ─── PRINCIPAIS RODOVIAS DO ESTADO DO RJ ───
  {
    id: 'rodovia-rj-106',
    name: 'RJ-106 (Rodovia Amaral Peixoto)',
    display_name: 'RJ-106 (Rodovia Amaral Peixoto) - Niterói, Maricá, Saquarema, Região dos Lagos',
    category: 'rodovia',
    lat: -22.9230,
    lng: -42.8250,
    keywords: ['rj 106', 'rj-106', 'amaral peixoto', 'rodovia amaral peixoto', 'estrada de marica'],
  },
  {
    id: 'rodovia-br-101-rio-santos',
    name: 'BR-101 (Rio - Santos / Niterói - Manilha)',
    display_name: 'Rodovia Governador Mário Covas (BR-101) - RJ',
    category: 'rodovia',
    lat: -22.8400,
    lng: -43.0800,
    keywords: ['br 101', 'br-101', 'niteroi manilha', 'rio santos', 'rodovia mario covas'],
  },
  {
    id: 'rodovia-br-116-dutra',
    name: 'Rodovia Presidente Dutra (BR-116)',
    display_name: 'Rodovia Presidente Dutra (BR-116) - Rio de Janeiro / São Paulo',
    category: 'rodovia',
    lat: -22.7900,
    lng: -43.3800,
    keywords: ['dutra', 'presidente dutra', 'br 116', 'br-116', 'rodovia dutra'],
  },
  {
    id: 'rodovia-via-lagos-rj-124',
    name: 'Via Lagos (RJ-124)',
    display_name: 'Rodovia Via Lagos (RJ-124) - Rio Bonito a São Pedro da Aldeia',
    category: 'rodovia',
    lat: -22.7500,
    lng: -42.4500,
    keywords: ['via lagos', 'rj 124', 'rj-124', 'pedagio via lagos'],
  },
  {
    id: 'rodovia-linha-vermelha',
    name: 'Linha Vermelha (Via Expressa Pres. João Goulart)',
    display_name: 'Linha Vermelha (RJ-071), Rio de Janeiro - RJ',
    category: 'rodovia',
    lat: -22.8500,
    lng: -43.2300,
    keywords: ['linha vermelha', 'rj 071', 'expressa galeao', 'acesso galeao'],
  },
  {
    id: 'rodovia-linha-amarela',
    name: 'Linha Amarela (Avenida Carlos Lacerda)',
    display_name: 'Linha Amarela, Rio de Janeiro - RJ',
    category: 'rodovia',
    lat: -22.9200,
    lng: -43.2900,
    keywords: ['linha amarela', 'pedagio linha amarela', 'barra ao centro', 'tunel covanca'],
  },
  {
    id: 'rodovia-avenida-brasil',
    name: 'Avenida Brasil (BR-101)',
    display_name: 'Avenida Brasil, Rio de Janeiro - RJ',
    category: 'rodovia',
    lat: -22.8600,
    lng: -43.3100,
    keywords: ['avenida brasil', 'av brasil', 'brt transbrasil'],
  },

  // ─── CAPITAIS & DESTINOS NACIONAIS FREQUENTES ───
  {
    id: 'br-sao-paulo',
    name: 'São Paulo - SP (Capital)',
    display_name: 'São Paulo - SP, Brasil (Centro / Av. Paulista)',
    category: 'cidade',
    lat: -23.5505,
    lng: -46.6333,
    keywords: ['sao paulo', 'são paulo', 'sp', 'avenida paulista', 'marco zero sp'],
  },
  {
    id: 'br-belo-horizonte',
    name: 'Belo Horizonte - MG',
    display_name: 'Belo Horizonte - MG, Brasil (Praça da Liberdade)',
    category: 'cidade',
    lat: -19.9167,
    lng: -43.9345,
    keywords: ['belo horizonte', 'bh', 'minas gerais', 'pampulha'],
  },
  {
    id: 'br-brasilia',
    name: 'Brasília - DF (Esplanada dos Ministérios)',
    display_name: 'Brasília - DF, Brasil',
    category: 'cidade',
    lat: -15.7975,
    lng: -47.8919,
    keywords: ['brasilia', 'brasília', 'df', 'esplanada dos ministerios', 'congresso nacional'],
  },
  {
    id: 'br-curitiba',
    name: 'Curitiba - PR',
    display_name: 'Curitiba - PR, Brasil',
    category: 'cidade',
    lat: -25.4284,
    lng: -49.2733,
    keywords: ['curitiba', 'pr', 'jardim botanico curitiba'],
  },
  {
    id: 'br-salvador',
    name: 'Salvador - BA',
    display_name: 'Salvador - BA, Brasil (Pelourinho)',
    category: 'cidade',
    lat: -12.9714,
    lng: -38.5014,
    keywords: ['salvador', 'bahia', 'pelourinho', 'farol da barra'],
  },
  {
    id: 'br-porto-alegre',
    name: 'Porto Alegre - RS',
    display_name: 'Porto Alegre - RS, Brasil',
    category: 'cidade',
    lat: -30.0346,
    lng: -51.2177,
    keywords: ['porto alegre', 'poa', 'rio grande do sul'],
  },
];

// Helper: Normalize string removing accents and special chars
export function normalizeGeoString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── SEARCH IN OFFLINE LOCAL DB ───
export function searchOfflineGeoDb(query: string, maxResults = 8): GeocodedLocation[] {
  if (!query || query.trim().length === 0) return [];
  const normalizedQuery = normalizeGeoString(query);
  const queryTokens = normalizedQuery.split(' ').filter((t) => t.length > 0);

  if (queryTokens.length === 0) return [];

  const scoredResults: { item: GeocodedLocation; score: number }[] = [];

  for (const item of BRAZIL_OFFLINE_GEO_DB) {
    const normName = normalizeGeoString(item.name);
    const normDisplay = normalizeGeoString(item.display_name);

    let score = 0;

    // Exact or prefix match on name
    if (normName === normalizedQuery) score += 100;
    else if (normName.startsWith(normalizedQuery)) score += 60;
    else if (normDisplay.includes(normalizedQuery)) score += 40;

    // Token match against name, display, keywords
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (normName.includes(token)) {
        score += 20;
        matchedTokens++;
      } else if (normDisplay.includes(token)) {
        score += 15;
        matchedTokens++;
      } else if (item.keywords.some((k) => normalizeGeoString(k).includes(token))) {
        score += 12;
        matchedTokens++;
      }
    }

    if (matchedTokens === queryTokens.length) {
      score += 30; // bonus for all tokens matching
    }

    if (score > 0) {
      scoredResults.push({ item, score });
    }
  }

  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.slice(0, maxResults).map((r) => r.item);
}

// ─── HYBRID GEOCODER (OFFLINE DB + NOMINATIM + FALLBACK) ───
export async function hybridResolveLocation(
  query: string,
  userLat: number = -22.9194,
  userLng: number = -42.8186
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // 1. First check offline DB for immediate exact or high confidence match
  const offlineMatches = searchOfflineGeoDb(trimmed, 3);
  if (offlineMatches.length > 0) {
    const top = offlineMatches[0];
    return {
      lat: top.lat,
      lng: top.lng,
      displayName: top.display_name,
    };
  }

  // 2. Try online OpenStreetMap Nominatim with focus on Brazil / user region
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&countrycodes=br&limit=3&viewbox=${userLng - 1.5},${userLat + 1.5},${userLng + 1.5},${userLat - 1.5}&bounded=0`;

    const res = await fetch(nomUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
    }
  } catch (e) {
    console.warn('Nominatim online lookup failed, checking fuzzy offline database...', e);
  }

  // 3. Fallback: Search again with partial tokens in offline DB
  const partialTokens = normalizeGeoString(trimmed).split(' ');
  for (const token of partialTokens) {
    if (token.length >= 3) {
      const fallbackMatches = searchOfflineGeoDb(token, 1);
      if (fallbackMatches.length > 0) {
        return {
          lat: fallbackMatches[0].lat,
          lng: fallbackMatches[0].lng,
          displayName: fallbackMatches[0].display_name,
        };
      }
    }
  }

  return null;
}
