# Patternia

*A puzzle of hidden rules.*

## Lancement

```bash
cd patternia
python3 -m http.server 8080
```

Puis ouvrir **http://localhost:8080** dans le navigateur.

> Les modules ES6 et le chargement des JSON nécessitent un serveur HTTP.
> Le double-clic sur `index.html` ne fonctionnera pas.

## Structure

```
patternia/
├── index.html              ← Page d'accueil
├── game.html               ← Écran de jeu
│
├── css/
│   ├── home.css            ← Styles page d'accueil
│   ├── game.css            ← Styles écran de jeu
│   └── ui.css              ← Overlays, hints, écrans
│
├── js/
│   ├── main.js             ← Boucle principale, orchestration
│   ├── home.js             ← Animation page d'accueil
│   ├── renderer.js         ← Rendu isométrique Canvas 2D
│   ├── player.js           ← Sphère, déplacements, bords
│   ├── input.js            ← Clavier, gamepad, joystick
│   ├── mechanics.js        ← Animations visuelles des tuiles
│   ├── rules.js            ← Moteur de règles
│   ├── level.js            ← Chargement JSON → grille
│   ├── audio.js            ← Sons procéduraux Web Audio API
│   ├── ui.js               ← HUD, écrans, hints, séquences
│   └── utils.js            ← Maths, projection isométrique
│
└── data/
    ├── mechanics.json      ← Registre des mécaniques visuelles
    ├── effects.json        ← Registre des effets gameplay
    ├── rules_schema.json   ← Documentation du langage de règles
    └── levels/
        ├── index.json      ← Liste ordonnée des niveaux
        ├── level_01.json   ← Blanc ou Rouge
        ├── level_02.json   ← Bleu ou Jaune
        ├── level_03.json   ← Alternance
        ├── level_04.json   ← Pattern BBY
        ├── level_05.json   ← Mémoire
        ├── level_06.json   ← Joker
        └── level_07.json   ← Le Mur Parle
```

## Ajouter un niveau

1. Créer `data/levels/level_XX.json`
2. Décrire la grille, les mécaniques, les règles (voir `data/rules_schema.json`)
3. Ajouter l'ID dans `data/levels/index.json`
4. Tester — **aucun JS à modifier** pour les cas standard

Pour les règles trop complexes pour le JSON pur :
→ Ajouter une fonction dans `js/rules.js` section `CUSTOM RULES`
→ La référencer via `{ "type": "custom_rule", "name": "..." }`

## Contrôles

| Entrée | Action |
|--------|--------|
| ↑ ↓ ← → ou WASD | Déplacement |
| Gamepad D-pad / stick gauche | Déplacement |
| Joystick tactile (mobile) | Déplacement |
