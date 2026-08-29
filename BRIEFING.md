# Cronoatles — briefing del projecte

Document per posar Claude Code al dia. Enganxa'l al repo com a BRIEFING.md o passa'l com a context a la primera sessió.

## Què construïm

Un fork del Fantasy Map Generator d'Azgaar que hi afegeix una dimensió temporal: la mateixa geografia vista al llarg de segles, amb civilitzacions que neixen, s'expandeixen, xoquen i cauen. L'usuari té una barra de temps: pot reproduir l'evolució com un vídeo, aturar-la en qualsevol any i fer zoom.

Referència visual: els atles històrics animats tipus Euratlas/GeaCron — mapa de to pergamí, fronteres com a tinta, etiquetes serif que creixen amb l'extensió de l'imperi. Aquells mapes estan dibuixats a mà; el nostre ha de sortir generat.

Fora d'abast (per ara): zoom 3D fins al carrer, assets, motors de joc. Tot es queda en 2D vectorial, que és el que permet que tot sigui procedural.

## Punt de partida

- Repo: github.com/Azgaar/Fantasy-Map-Generator — llicència MIT (fork, modificació i ús comercial permesos, cal mantenir l'avís de copyright)
- Stack actual: Vite + TypeScript, tests amb Playwright
- Arquitectura declarada al README: configuració → generadors → dades del món → renderitzador, amb la capa de dades lliure de lògica i de codi de pintat

### Fitxers que importen

| Fitxer | Per què |
|---|---|
| `src/generators/index.ts` | El pipeline ordenat. Geografia primer, política després — aquesta separació és el que fa viable el projecte |
| `src/generators/states-generator.ts` | ~900 línies. Conté `expandStates()`, el cor de tot |
| `src/generators/cultures-generator.ts` | Cultures: origen, expansió |
| `src/generators/burgs-generator.ts` | Assentaments |
| `src/data/heightmap-templates.ts` | El mini-DSL de terreny (veure secció IA) |
| `src/generators/states-generator.test.ts` | Xarxa de seguretat per refactoritzar |

## Fase 0 — reconeixement (abans de tocar res)

- Llegir `states-generator.ts` sencer i explicar com funciona `expandStates()`: quines estructures llegeix, quines escriu, si és idempotent
- Localitzar on es desa la propietat política per cel·la (`cells.state` o equivalent)
- Provar de cridar `expandStates()` dues vegades sobre el mateix terreny i veure què es trenca. Hi ha indicis que ja està previst al codi, però cal confirmar-ho
- Entendre el format `.map` per saber on encabir-hi la seqüència temporal

Aquesta fase decideix si el pla és viable. No escriure codi nou fins a tenir-la clara.

## Fase 1 — el generador d'eres (el nucli del projecte)

La idea: la geografia es genera un sol cop i es congela. Relleu, rius, costes, biomes són el mateix escenari per a totes les eres. El que varia és només la capa política.

Cada era es genera cridant els generadors polítics ja existents, però amb condicions inicials heretades de l'era anterior en comptes de llavors aleatòries. Aquesta herència és tot el projecte:

- Els focus de la nova era neixen preferentment on hi havia poder
- Les ciutats grans sobreviuen; els assentaments petits desapareixen
- Camins, ponts i límits de parcel·la persisteixen — són el que més sobreviu a la realitat (el cardo i el decumanus de Barcino encara són carrers de Barcelona)
- Els edificis singulars es reconverteixen (temple → església → magatzem)
- Els topònims muten fonèticament en lloc de substituir-se (Barcino → Barcelona, Ilerda → Lleida). Unes quantes regles de canvi de so per cultura i els noms expliquen sols la història de la regió

Model mental: estratigrafia. Cada era és una capa dipositada sobre l'anterior, amb regles de què sobreviu i què no.

## Fase 2 — la barra de temps

Un cop les eres estan precalculades, això és fàcil: el slider només decideix quina capa es dibuixa. Reproducció, pausa, velocitat, i zoom lliure en qualsevol moment.

Avís conegut: Azgaar renderitza en SVG i regenerar política triga segons, no mil·lisegons. Per tenir flux continu cal precalcular totes les eres d'una tirada i que el slider només canviï capes. Si no, hi haurà salts.

## Fase 3 — capa d'IA (opcional, després)

Troballa clau: Azgaar ja té un DSL per descriure terreny. Format: `eina quantitat alçada rangX rangY`, una instrucció per línia, rangs en % del mapa. Eines: Hill, Range, Trough, Pit, Strait, Add, Multiply, Smooth, Mask.

Això vol dir que la IA no genera cap mapa — escriu quatre línies de text. "Vull un mar com l'Egeu aquí" es tradueix a instruccions d'aquest DSL. El "aquí" són els rangs de coordenades, que surten d'on l'usuari hagi clicat. El generador determinista fa la resta.

Mateix principi per al lore: la IA retorna JSON estructurat amb els camps que el motor d'eres ja espera (cultura d'origen, any de fundació, vigor, agressivitat, relacions), no text lliure. Així s'integra amb la simulació en comptes de quedar com a decoració.

Dues regles innegociables:

1. Validar sempre la sortida — parsejar, clampar rangs, rebutjar el que no encaixi. Mai executar text del model a cara descoberta
2. Desar el DSL generat dins del fitxer del mapa — el món ha de seguir sent reproduïble sense tornar a trucar a cap IA. Crític per poder recalcular eres

Distribució: clau d'API pròpia de l'usuari al localStorage, amb selector de proveïdor. Azgaar és 100% client i sense servidor; muntar un backend només per guardar claus canviaria la naturalesa del projecte i faria pagar els tokens de tothom.

## Convencions de treball

- Branca `eres`, master net per poder sincronitzar amb l'upstream d'Azgaar
- Commits petits i sovint
- Playwright per verificar visualment: generar un món, capturar pantalla, comprovar que cap era surt buida i que les fronteres no es trenquen
- El servidor de dev (`npm run dev`) obert en paral·lel — les decisions estètiques les pren l'humà mirant el navegador
