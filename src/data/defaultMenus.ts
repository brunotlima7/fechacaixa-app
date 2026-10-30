import { MenuItem } from '../types/saas.ts';

export const FLOR_DE_BRASA_MENU: MenuItem[] = [
  // 1. HAPPY HOUR (Seg a sex, das 17h às 19h15) - Bloqueados no fechamento por horário limite
  { name: 'Caldinho de Feijão (Happy Hour)', price: 9.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Chopp Brahma (Happy Hour)', price: 11.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Caipirinha (Happy Hour)', price: 19.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Estrella Galicia (Happy Hour)', price: 21.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Aperol Spritz (Happy Hour)', price: 22.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Margarita (Happy Hour)', price: 24.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Batata Frita (Happy Hour)', price: 27.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Pastel de Queijo (Happy Hour)', price: 29.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Bolinho de Carne (Happy Hour)', price: 32.90, cat: 'Happy Hour', isPromo: true },
  { name: 'Dadinhos de Tapioca (Happy Hour)', price: 34.90, cat: 'Happy Hour', isPromo: true },

  // 2. COMBOS ESPECIAIS / PROMOCIONAIS - Bloqueados no fechamento por horário limite
  { name: 'Combo Botequim', price: 54.90, cat: 'Combos Especiais', isPromo: true },
  { name: 'Combo Onça', price: 59.90, cat: 'Combos Especiais', isPromo: true },
  { name: 'Combo Brasa', price: 69.90, cat: 'Combos Especiais', isPromo: true },
  { name: 'Combo Torresmo', price: 69.90, cat: 'Combos Especiais', isPromo: true },

  // 3. BEBIDAS NÃO ALCOÓLICAS
  { name: 'Água Mineral', price: 7.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Refrigerante', price: 8.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Café Especial na Prensa Francesa', price: 8.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Soda Italiana', price: 13.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Chá Mate Batido', price: 14.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Chá Mate da Casa', price: 15.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Suco Natural', price: 16.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Red Bull', price: 19.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'Acqua Panna (505ml)', price: 38.90, cat: 'Bebidas Não Alcoólicas' },
  { name: 'San Pellegrino (505ml)', price: 38.90, cat: 'Bebidas Não Alcoólicas' },

  // 4. DRINKS AUTORAIS SEM ÁLCOOL
  { name: 'Drink Verbena (Sem Álcool)', price: 21.90, cat: 'Drinks Sem Álcool' },
  { name: 'Drink Bromélia (Sem Álcool)', price: 22.90, cat: 'Drinks Sem Álcool' },
  { name: 'Drink Dália (Sem Álcool)', price: 29.90, cat: 'Drinks Sem Álcool' },
  { name: 'Drink Acácia (Sem Álcool)', price: 31.90, cat: 'Drinks Sem Álcool' },

  // 5. CERVEJAS & CHOPP
  { name: 'Chopp Brahma (300ml)', price: 14.90, cat: 'Cervejas' },
  { name: 'Sol Zero (330ml)', price: 16.90, cat: 'Cervejas' },
  { name: 'Heineken Zero (330ml)', price: 16.90, cat: 'Cervejas' },
  { name: 'Heineken Long Neck (330ml)', price: 17.90, cat: 'Cervejas' },
  { name: 'Corona (330ml)', price: 17.90, cat: 'Cervejas' },
  { name: 'Stella Artois Pure Gold (330ml)', price: 17.90, cat: 'Cervejas' },
  { name: 'Therezópolis Jade IPA (500ml)', price: 23.90, cat: 'Cervejas' },
  { name: 'Therezópolis Elfenbein Weissbier (500ml)', price: 23.90, cat: 'Cervejas' },
  { name: 'Estrella Galicia (600ml)', price: 24.90, cat: 'Cervejas' },
  { name: 'Original (600ml)', price: 25.90, cat: 'Cervejas' },
  { name: 'Heineken (600ml)', price: 26.90, cat: 'Cervejas' },

  // 6. CAIPIRINHAS AUTORAIS
  { name: 'Caipirinha Semente de Fogo', price: 31.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Fruto do Sol', price: 32.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Pé de Jabuticaba', price: 32.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Frutos da Brasa', price: 34.90, cat: 'Caipirinhas' },

  // 7. CAIPIRINHAS CLÁSSICAS
  { name: 'Caipirinha Morango', price: 27.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Limão Taiti', price: 27.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Limão Descascado', price: 28.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Maracujá', price: 29.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Abacaxi', price: 29.90, cat: 'Caipirinhas' },
  { name: 'Caipirinha Três Limões com Rapadura', price: 29.90, cat: 'Caipirinhas' },

  // 8. COQUETÉIS AUTORAIS
  { name: 'Coquetel Gardenia', price: 34.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Calêndula', price: 35.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Orquídea', price: 36.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Jasmim', price: 36.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Girassol', price: 37.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Rosa', price: 38.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Azaléia', price: 38.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Terroso', price: 39.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Lírio', price: 39.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Flor de Brasa', price: 39.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Lótus', price: 39.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Violeta', price: 42.90, cat: 'Coquetéis Autorais' },
  { name: 'Coquetel Magnólia', price: 46.90, cat: 'Coquetéis Autorais' },

  // 9. COQUETÉIS CLÁSSICOS
  { name: 'Mojito', price: 33.90, cat: 'Coquetéis Clássicos' },
  { name: 'Bellini', price: 34.90, cat: 'Coquetéis Clássicos' },
  { name: 'French Martini', price: 34.90, cat: 'Coquetéis Clássicos' },
  { name: 'Moscow Mule', price: 34.90, cat: 'Coquetéis Clássicos' },
  { name: 'Dry Martini', price: 35.90, cat: 'Coquetéis Clássicos' },
  { name: 'Whisky Sour', price: 35.90, cat: 'Coquetéis Clássicos' },
  { name: 'Gin Tônica', price: 36.90, cat: 'Coquetéis Clássicos' },
  { name: 'Aperol Spritz', price: 37.90, cat: 'Coquetéis Clássicos' },
  { name: 'Kir Royal', price: 37.90, cat: 'Coquetéis Clássicos' },
  { name: 'Penicillin', price: 37.90, cat: 'Coquetéis Clássicos' },
  { name: 'Cosmopolitan', price: 39.90, cat: 'Coquetéis Clássicos' },
  { name: 'Fitzgerald', price: 39.90, cat: 'Coquetéis Clássicos' },
  { name: 'Negroni', price: 39.90, cat: 'Coquetéis Clássicos' },
  { name: 'Paloma', price: 39.90, cat: 'Coquetéis Clássicos' },
  { name: 'Bramble', price: 40.90, cat: 'Coquetéis Clássicos' },
  { name: 'Long Island Iced Tea', price: 40.90, cat: 'Coquetéis Clássicos' },
  { name: 'Old Fashioned', price: 43.90, cat: 'Coquetéis Clássicos' },
  { name: 'Margarita', price: 43.90, cat: 'Coquetéis Clássicos' },
  { name: 'Clover Club', price: 49.90, cat: 'Coquetéis Clássicos' },

  // 10. CLÁSSICOS DE BOTEQUIM
  { name: 'Caldinho de Feijão', price: 14.90, cat: 'Clássicos de Botequim' },
  { name: 'Batata Frita', price: 34.90, cat: 'Clássicos de Botequim' },
  { name: 'Pastel de Queijo (6 un)', price: 38.90, cat: 'Clássicos de Botequim' },
  { name: 'Dadinhos de Tapioca (4 un)', price: 39.90, cat: 'Clássicos de Botequim' },
  { name: 'Bolinho de Carne Defumada (8 un)', price: 39.90, cat: 'Clássicos de Botequim' },
  { name: 'Torresmo Pururuca', price: 44.90, cat: 'Clássicos de Botequim' },

  // 11. CRUDOS, TOASTS & FRESCOS
  { name: 'Toast de Shiitake', price: 34.90, cat: 'Crudos, Toasts & Frescos' },
  { name: 'Caprese (Releitura)', price: 37.90, cat: 'Crudos, Toasts & Frescos' },
  { name: 'Carne de Onça (4 un)', price: 39.90, cat: 'Crudos, Toasts & Frescos' },
  { name: 'Carpaccio', price: 39.90, cat: 'Crudos, Toasts & Frescos' },
  { name: 'Salada Caesar', price: 39.90, cat: 'Crudos, Toasts & Frescos' },
  { name: 'Salada Verde', price: 39.90, cat: 'Crudos, Toasts & Frescos' },
  { name: 'Steak Tartare de Brioche', price: 41.90, cat: 'Crudos, Toasts & Frescos' },
  { name: 'Polvo com Romesco', price: 69.90, cat: 'Crudos, Toasts & Frescos' },

  // 12. ASSINATURAS DA CASA
  { name: 'Croquete de Carne (4 un)', price: 34.90, cat: 'Assinaturas da Casa' },
  { name: 'Mini Pastéis de Milho & Gorgonzola (6 un)', price: 36.90, cat: 'Assinaturas da Casa' },
  { name: 'Mil-Folhas de Mandioca', price: 39.90, cat: 'Assinaturas da Casa' },
  { name: 'Moules Frites', price: 39.90, cat: 'Assinaturas da Casa' },
  { name: 'Linguiça de Pernil & Queijo Coalho', price: 42.90, cat: 'Assinaturas da Casa' },

  // 13. BURGERS & ADICIONAIS
  { name: 'Adicional de Salada', price: 3.00, cat: 'Burgers' },
  { name: 'Burger', price: 39.90, cat: 'Burgers' },
  { name: 'Burger Vegetariano', price: 39.90, cat: 'Burgers' },
  { name: 'Burger do Chef', price: 44.90, cat: 'Burgers' },
  { name: 'Burger Serrano', price: 46.90, cat: 'Burgers' },

  // 14. PRINCIPAIS INDIVIDUAIS
  { name: 'Baião de Dois com Costelinha', price: 84.90, cat: 'Principais Individuais' },
  { name: 'Filé Oswaldo Aranha', price: 89.90, cat: 'Principais Individuais' },
  { name: 'Costela Desfiada & Prensada', price: 89.90, cat: 'Principais Individuais' },
  { name: 'Arroz de Pato', price: 99.90, cat: 'Principais Individuais' },

  // 15. DA BRASA PARA COMPARTILHAR
  { name: 'Galeto na Brasa com Polenta (2 pessoas)', price: 139.90, cat: 'Para Compartilhar' },
  { name: 'Prime Rib Suíno (2 a 3 pessoas)', price: 149.90, cat: 'Para Compartilhar' },
  { name: 'Costela Bovina (2 pessoas)', price: 159.90, cat: 'Para Compartilhar' },
  { name: 'Assado de Tiras (2 pessoas)', price: 169.90, cat: 'Para Compartilhar' },
  { name: 'Ancho na Brasa (2 pessoas)', price: 189.90, cat: 'Para Compartilhar' },
  { name: 'Bisteca Fiorentina (2 pessoas)', price: 199.90, cat: 'Para Compartilhar' },
  { name: 'Fraldinha na Brasa com Mostarda (2 pessoas)', price: 199.90, cat: 'Para Compartilhar' },
  { name: 'Alcatrão de Igreja (2 a 3 pessoas)', price: 249.90, cat: 'Para Compartilhar' },
  { name: 'Costela Bovina (4 pessoas)', price: 249.90, cat: 'Para Compartilhar' },

  // 16. DEPOIS DO FOGO (Sobremesas)
  { name: 'Banoffee', price: 21.90, cat: 'Sobremesas' },
  { name: 'Brigadeiro de Colher', price: 22.90, cat: 'Sobremesas' },
  { name: 'Cartola', price: 24.90, cat: 'Sobremesas' },
  { name: 'Brownie da Casa', price: 24.90, cat: 'Sobremesas' },
  { name: 'Petit Gâteau Brasileiro', price: 26.90, cat: 'Sobremesas' },
  { name: 'Tiramisu', price: 26.90, cat: 'Sobremesas' },

  // 17. TAXAS E SERVIÇOS
  { name: 'Couvert Artístico', price: 6.00, cat: 'Taxas e Serviços' },
  { name: 'Taxa Rolha de Vinho', price: 40.00, cat: 'Taxas e Serviços' },
  { name: 'Taxa Rolha Destilados', price: 70.00, cat: 'Taxas e Serviços' },
];

export const BAR_DO_VICTOR_MENU: MenuItem[] = [
  { name: 'Bolinho de Bacalhau (6 un)', price: 42.00, cat: 'Petiscos' },
  { name: 'Camarão à Milanesa Victor', price: 89.90, cat: 'Petiscos' },
  { name: 'Casquinha de Siri', price: 26.00, cat: 'Entradas' },
  { name: 'Pastel de Camarão (4 un)', price: 36.00, cat: 'Petiscos' },
  { name: 'Chopp Pilsen (300ml)', price: 13.90, cat: 'Bebidas' },
  { name: 'Caipirinha Cachaça Especial', price: 28.00, cat: 'Drinks' },
  { name: 'Moqueca de Peixe e Camarão', price: 148.00, cat: 'Pratos Principais' },
  { name: 'Água Mineral', price: 7.50, cat: 'Bebidas' },
  { name: 'Refrigerante', price: 8.50, cat: 'Bebidas' },
  { name: 'Couvert Artístico', price: 6.00, cat: 'Serviços' },
];

export const BABILONIA_MENU: MenuItem[] = [
  { name: 'Carpaccio Clássico Babilônia', price: 45.00, cat: 'Entradas' },
  { name: 'Filé Mignon ao Poivre', price: 82.00, cat: 'Pratos' },
  { name: 'Batata Frita Rústica', price: 32.00, cat: 'Petiscos' },
  { name: 'Chopp Stella Artois (300ml)', price: 16.00, cat: 'Bebidas' },
  { name: 'Aperol Spritz Babilônia', price: 36.00, cat: 'Coquetéis' },
  { name: 'Gin Tônica Curitiba Botanicals', price: 38.00, cat: 'Coquetéis' },
  { name: 'Água Mineral', price: 7.90, cat: 'Bebidas' },
  { name: 'Brownie com Sorvete', price: 26.00, cat: 'Sobremesas' },
  { name: 'Taxa de Serviço', price: 10.00, cat: 'Serviços' },
];

export const TAJ_BAR_MENU: MenuItem[] = [
  { name: 'Sashimi Misto Taj (12 cortes)', price: 68.00, cat: 'Japonês' },
  { name: 'Uramaki Salmão Especial (8 un)', price: 44.00, cat: 'Japonês' },
  { name: 'Dumpling de Porco & Gengibre', price: 38.00, cat: 'Entradas' },
  { name: 'Drink Taj Dragon (Autoral)', price: 42.00, cat: 'Drinks' },
  { name: 'Moscow Mule Taj', price: 38.00, cat: 'Drinks' },
  { name: 'Heineken Long Neck', price: 18.00, cat: 'Cervejas' },
  { name: 'Red Bull Energy Drink', price: 22.00, cat: 'Bebidas' },
  { name: 'Taxa Entrada / Couvert', price: 20.00, cat: 'Serviços' },
];
