-- Dados iniciais. Idempotente.

INSERT INTO categoria (nome, descricao) VALUES
  ('Doces',               'Sobremesas, bolos e doces para todas as ocasiões.'),
  ('Salgados',            'Pratos e petiscos salgados para o dia a dia.'),
  ('Receitas rápidas',    'Prontas em 20 minutos ou menos.'),
  ('Receitas econômicas', 'Ótimas opções para economizar sem perder o sabor.'),
  ('Outras',              'Bebidas, lanches e outras ideias.')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO receita (id_categoria, nome, descricao, ingredientes, modo_preparo, tempo_preparo)
SELECT c.id_categoria, v.nome, v.descricao, v.ingredientes, v.modo, v.tempo
FROM (VALUES
  ('Doces', 'Brigadeiro',
   'O clássico doce de festa, com poucos ingredientes.',
   E'1 lata de leite condensado\n1 colher (sopa) de manteiga\n4 colheres (sopa) de chocolate em pó\nChocolate granulado para enrolar',
   E'Misture o leite condensado, a manteiga e o chocolate em uma panela.\nLeve ao fogo baixo mexendo sem parar até desgrudar do fundo.\nDeixe esfriar, enrole em bolinhas e passe no granulado.', 25),
  ('Doces', 'Bolo de cenoura',
   'Bolo fofinho feito no liquidificador, com cobertura de chocolate.',
   E'3 cenouras médias\n3 ovos\n1/2 xícara de óleo\n2 xícaras de açúcar\n2 xícaras de farinha de trigo\n1 colher (sopa) de fermento',
   E'Bata no liquidificador as cenouras, os ovos e o óleo.\nMisture com o açúcar e a farinha e acrescente o fermento por último.\nAsse em forno a 180 °C por cerca de 40 minutos.', 55),
  ('Receitas rápidas', 'Bolo de caneca',
   'Sobremesa individual pronta no micro-ondas.',
   E'4 colheres (sopa) de farinha de trigo\n3 colheres (sopa) de açúcar\n2 colheres (sopa) de chocolate em pó\n1 ovo\n3 colheres (sopa) de leite\n2 colheres (sopa) de óleo\n1 colher (chá) de fermento',
   E'Misture tudo em uma caneca grande até ficar homogêneo.\nLeve ao micro-ondas por 2 a 3 minutos.\nDeixe amornar antes de comer.', 5),
  ('Receitas rápidas', 'Omelete simples',
   'Café da manhã ou jantar rápido em poucos minutos.',
   E'2 ovos\nSal a gosto\n1 colher (chá) de óleo ou manteiga\nOpcional: queijo, tomate ou presunto',
   E'Bata os ovos com sal.\nAqueça a frigideira com o óleo e despeje os ovos.\nAdicione o recheio, dobre ao meio e sirva.', 8),
  ('Salgados', 'Pão de queijo',
   'Crocante por fora e macio por dentro.',
   E'2 xícaras de polvilho doce\n1 xícara de leite\n1/2 xícara de óleo\n1 ovo\n1 xícara de queijo ralado\n1 colher (chá) de sal',
   E'Ferva o leite com o óleo e o sal e escalde o polvilho.\nDepois de morno, adicione o ovo e o queijo e amasse bem.\nFaça bolinhas e asse a 200 °C por cerca de 25 minutos.', 40),
  ('Salgados', 'Panqueca simples',
   'Massa básica que aceita qualquer recheio.',
   E'1 xícara de farinha de trigo\n1 xícara de leite\n1 ovo\n1 pitada de sal\n1 colher (sopa) de óleo',
   E'Bata todos os ingredientes no liquidificador.\nDespeje uma concha em frigideira untada e aquecida.\nDoure dos dois lados e recheie a gosto.', 20),
  ('Receitas econômicas', 'Macarrão alho e óleo',
   'Prato barato, saboroso e pronto em poucos minutos.',
   E'250 g de macarrão espaguete\n4 dentes de alho fatiados\n4 colheres (sopa) de azeite ou óleo\nSal e pimenta a gosto\nSalsinha picada',
   E'Cozinhe o macarrão em água com sal até ficar al dente.\nDoure o alho no azeite em fogo baixo sem deixar queimar.\nMisture o macarrão ao alho, finalize com salsinha e sirva.', 20),
  ('Receitas econômicas', 'Arroz de forno com sobras',
   'Aproveite o arroz do dia anterior e o que tiver na geladeira.',
   E'3 xícaras de arroz cozido\n1 xícara de legumes picados\n2 ovos\n1 xícara de queijo ralado\nSal e temperos a gosto',
   E'Misture o arroz, os legumes, os ovos e metade do queijo.\nColoque em uma forma untada e cubra com o restante do queijo.\nAsse a 200 °C até dourar.', 30),
  ('Outras', 'Vitamina de banana',
   'Bebida nutritiva e barata para o lanche.',
   E'2 bananas maduras\n2 copos de leite gelado\n1 colher (sopa) de aveia\nAçúcar ou mel a gosto',
   E'Bata todos os ingredientes no liquidificador.\nSirva em seguida.', 5)
) AS v(cat, nome, descricao, ingredientes, modo, tempo)
JOIN categoria c ON c.nome = v.cat
WHERE NOT EXISTS (SELECT 1 FROM receita r WHERE r.nome = v.nome AND r.id_usuario IS NULL);

UPDATE receita SET dificuldade = 'Média'
WHERE id_usuario IS NULL AND nome IN ('Pão de queijo', 'Bolo de cenoura');

INSERT INTO dica (titulo, conteudo, tipo) VALUES
  ('Leia a receita até o fim antes de começar',
   'Separe todos os ingredientes e utensílios antes de ligar o fogão. Isso evita surpresas e queimados no meio do preparo.', 'culinaria'),
  ('Alho nunca deve queimar',
   'Doure o alho em fogo baixo. Quando queima, fica amargo e estraga o prato inteiro.', 'culinaria'),
  ('Teste o fermento',
   'Coloque uma colher de fermento em água morna: se fizer bolhas, ainda está bom para uso.', 'culinaria'),
  ('Planeje o cardápio da semana',
   'Listar as refeições antes de ir ao mercado reduz compras por impulso e desperdício de comida.', 'economia'),
  ('Aproveite talos e cascas',
   'Talos de couve, cascas de legumes bem lavados e pão amanhecido rendem refogados, caldos e farofas.', 'economia'),
  ('Congele em porções',
   'Feijão, arroz e carnes congelados em porções individuais evitam desperdício e agilizam o dia a dia.', 'economia')
ON CONFLICT (titulo) DO NOTHING;

INSERT INTO ingrediente_info (nome, descricao, conservacao, substituicao) VALUES
  ('Ovo', 'Fonte de proteína que dá liga e estrutura a bolos, massas e omeletes.',
   'Na geladeira, por até 3 semanas.', '1 ovo ≈ 1 colher (sopa) de linhaça hidratada em 3 colheres de água.'),
  ('Leite condensado', 'Leite com açúcar concentrado, base de muitos doces.',
   'Lata fechada na despensa; depois de aberta, em pote fechado na geladeira por até 3 dias.', NULL),
  ('Fermento em pó químico', 'Faz a massa crescer. Deve ser adicionado por último e misturado com delicadeza.',
   'Local seco e fechado, longe do calor.', '1 colher (chá) de bicarbonato + 1 colher (chá) de vinagre ou suco de limão.'),
  ('Polvilho doce', 'Amido de mandioca usado no pão de queijo e em biscoitos; dá elasticidade.',
   'Pote bem fechado, em local seco.', 'Polvilho azedo muda o sabor, mas funciona.'),
  ('Alho', 'Tempero base de pratos salgados. Quanto mais picado, mais forte o sabor.',
   'Local seco e ventilado, por até 3 meses.', 'Alho em pó (1/4 da quantidade).'),
  ('Aveia', 'Cereal rico em fibras; combina com vitaminas, bolos e mingaus.',
   'Pote fechado, longe da umidade.', NULL),
  ('Manteiga', 'Gordura de sabor marcante para massas e doces.',
   'Na geladeira, por até 2 meses.', 'Margarina ou óleo (em menor quantidade).')
ON CONFLICT (nome) DO NOTHING;
