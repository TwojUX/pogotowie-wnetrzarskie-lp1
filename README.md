# Pogotowie Wnętrzarskie - LP1

Responsywna strona zgodna z projektem Figma „LP - wykończenie pod klucz”, stan z 23 listopada 2026.

- Projekt: https://www.figma.com/design/QD5twSBKnjBTYPo9O8sgm7/?node-id=141-348
- Publikacja: https://twojux.github.io/pogotowie-wnetrzarskie-lp1/
- Galeria sześciu realizacji z podpisami i dziesięć zdjęć mieszkania Izy pochodzą z LP2. Teksty pozostałych sekcji pochodzą z projektu LP1.

Strona jest statyczna: `index.html`, `style.css`, `strona.js` i lokalne zasoby w `assets/`. Nie wymaga budowania ani zależności. GitHub Pages publikuje główną gałąź z katalogu głównego.

Podgląd lokalny: `python3 -m http.server 8765`.

Slidery obsługują przyciski, gest przesunięcia i klawisze strzałek. Menu mobilne obsługuje klawiaturę i Escape. Przyciski konsultacji otwierają połączenie telefoniczne. Strona zachowuje ustawienie `noindex, follow` istniejącego LP kampanii.

Sprawdzono układ w szerokościach 320, 390, 768, 1024 i 1440 pikseli, ładowanie obrazów, menu oraz slidery zdjęć i opinii.
