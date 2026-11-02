# Flatwhite Arcade

[English](README.md) | 한국어

잠깐 쉬어 갈 때 즐길 수 있는 작은 브라우저 게임 모음입니다. 로비에서 카트리지를 골라 시작하고, 게임 안의 Arcade 링크로 돌아올 수 있습니다.

[lucasflatwhite.com/arcade에서 플레이하기](https://www.lucasflatwhite.com/arcade/)

## 게임

| 게임 | 어떤 게임인가요 |
| --- | --- |
| [Snake](https://www.lucasflatwhite.com/arcade/snake/) | CPU 상대와 커피콩을 두고 겨룹니다. 에스프레소로 콤보를 쌓고, 콜드브루로 상대를 느리게 하거나 몸으로 가둘 수 있습니다. 방향키, WASD, 스와이프로 조작합니다. |
| [Beach Ball Merge](https://www.lucasflatwhite.com/arcade/suika/) | 스포츠 공을 떨어뜨려 같은 공끼리 합치고 비치볼을 만듭니다. 혼자 하거나 데스크톱 한 대에서 둘이 함께할 수 있습니다. |

로비에서는 Snake 데모가 실제로 움직이고, 키보드로 게임을 고를 수 있습니다. 두 게임 모두 최고 기록을 브라우저에 저장합니다.

이 저장소에는 TypeScript, Canvas, Vite로 만든 로비와 Snake가 들어 있습니다. Beach Ball Merge는 Godot로 만들었으며, [suika-balls](https://github.com/lucas-flatwhite/suika-balls)에서 별도로 개발하고 배포합니다. 메인 사이트에서는 두 프로젝트를 `/arcade/`에서 연결합니다.

## 로컬에서 실행하기

```sh
npm install
npm run dev          # http://localhost:5173/arcade/
```

```sh
npm test -- --run
npm run build
npm run preview      # http://localhost:4173/arcade/
```

Beach Ball Merge는 로컬 빌드에 포함되지 않으므로 배포된 사이트에서 플레이해 주세요. 라우팅, 게임 내부 구조, 카트리지 추가 방법은 [개발 문서(영문)](docs/development.md)에 정리했습니다.
