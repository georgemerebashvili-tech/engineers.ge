# Module Format v1

`engineers.ge`-ის Phase 2 composer, simulators და export/import flow ერთიანდება ამ JSON/TypeScript contract-ზე.

## მიზანი

- ერთმა Zod schema-მ დაავალიდიროს ყველა building/module payload.
- simulators-იდან export რაც გამოდის, composer-მა იმავე ფორმატით უნდა წაიკითხოს.
- connections, repeats და standard refs იყოს საერთო ენა stair / elevator / parking / corridor მოდულებისთვის.

## ფაილები

- Schema: [lib/building/module-schema.ts](../../lib/building/module-schema.ts)
- Utils: [lib/building/module-utils.ts](../../lib/building/module-utils.ts)

## Root Building Object

| Field | Type | Required | აღწერა |
|---|---|---:|---|
| `schemaVersion` | `1` | yes | მიმდინარე ფორმატის ვერსია |
| `id` | `uuid` | yes | building-ის უნიკალური id |
| `name` | `string` | yes | user-visible სახელი |
| `createdAt` | `ISO datetime` | yes | შექმნის დრო |
| `updatedAt` | `ISO datetime` | yes | ბოლო ცვლილების დრო |
| `modules` | `Module[]` | yes | ყველა child module |
| `meta.author` | `string` | no | owner / author label |
| `meta.description` | `string` | no | მოკლე აღწერა |
| `meta.dxfSource` | `string` | no | შემოტანილი DXF filename/hash |

## Shared Module Fields

ყველა module-ს აქვს ერთი და იგივე base envelope, შემდეგ `type`-ის მიხედვით საკუთარი `params`.

| Field | Type | Required | აღწერა |
|---|---|---:|---|
| `id` | `uuid` | yes | module id |
| `type` | `'stair' \| 'elevator' \| 'parking' \| 'corridor'` | yes | discriminator |
| `name` | `string` | no | UI label |
| `standard.id` | `'EN-12101-6' \| 'NFPA-92' \| 'SP-7.13130' \| 'ASHRAE-62.1'` | yes | ნორმატიული წყარო |
| `standard.classOrType` | `string` | yes | Class / Type / scenario |
| `units` | `'metric' \| 'imperial'` | yes | display unit system |
| `transform.x/y/z` | `number` | yes | scene placement |
| `transform.rotY` | `number` | yes | Y-axis rotation |
| `repeats.axis` | `'Y'` | no | stack axis |
| `repeats.count` | `1..40` | no | repeat count |
| `repeats.step` | `positive number` | no | spacing between repeats |
| `connections` | `uuid[]` | yes | სხვა module-ების ids |

## Stair Params

| Field | Type | Required | აღწერა |
|---|---|---:|---|
| `floors` | `2..40 int` | yes | ზედა სართულები |
| `floorH` | `number > 0` | yes | სართულის სიმაღლე |
| `basement` | `0..3 int` | yes | სარდაფები |
| `shaftW`, `shaftD` | `number > 0` | yes | შახტის ზომები |
| `stairType` | `switchback \| straight \| spiral` | yes | კიბის ტიპი |
| `doorW`, `doorH` | `number > 0` | yes | კარის ზომები |
| `doorPos` | `front \| side \| alternate` | yes | კარის პოზიცია |
| `supply` | `bottom \| top \| both \| per-floor` | yes | ჰაერის მიწოდება |
| `dp` | `number > 0` | yes | target pressure |

## Elevator Params

| Field | Type | Required | აღწერა |
|---|---|---:|---|
| `floors`, `floorH` | number | yes | ვერტიკალური extent |
| `shaftW`, `shaftD` | number | yes | შახტის ზომები |
| `cabinW`, `cabinD` | number | yes | კაბინის ზომები |
| `velocity` | number | yes | კაბინის სიჩქარე |
| `doorW`, `doorH` | number | yes | კარი |
| `dp` | number | yes | target pressure |
| `includeMachineRoom` | boolean | yes | machine room flag |

## Parking Params

| Field | Type | Required | აღწერა |
|---|---|---:|---|
| `area` | number | yes | floor area |
| `ceilingH` | number | yes | ჭერის სიმაღლე |
| `spots` | int | yes | parking spots |
| `ramp.w`, `ramp.l` | number | yes | ramp geometry |
| `fanCount` | int | yes | jet/duct fan count |
| `fanThrust` | number | yes | thrust rating |
| `scenario` | `normal \| peak \| fire` | yes | operating mode |

## Corridor Params

| Field | Type | Required | აღწერა |
|---|---|---:|---|
| `length`, `width`, `height` | number | yes | corridor geometry |
| `roomCount` | int | yes | adjacent rooms |
| `stairDp` | number | no | neighboring stair context |
| `liftDp` | number | no | neighboring lift context |
| `openDoors` | `int[]` | yes | open room door indices |
| `dp` | number | yes | corridor target pressure |

## Validation Rules

- ფორმატი დგინდება Zod discriminated union-ით (`type`).
- უცნობი ველები reject-დება (`strict()` schemas).
- UUID და ISO datetime ფორმატები მკაცრად მოწმდება.
- error formatter აბრუნებს bilingual ტექსტს: Georgian + original Zod message.
- `roundTripBuilding(raw)` ამოწმებს: `parse(stringify(parse(raw)))`.

## Example JSON

```json
{
  "schemaVersion": 1,
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "name": "ჩემი 5-სართული საცხოვრ.",
  "createdAt": "2026-04-18T10:00:00.000Z",
  "updatedAt": "2026-04-18T10:30:00.000Z",
  "modules": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "type": "stair",
      "name": "Fixture Stair",
      "standard": {
        "id": "EN-12101-6",
        "classOrType": "A"
      },
      "units": "metric",
      "transform": {
        "x": 0,
        "y": 0,
        "z": 0,
        "rotY": 0
      },
      "repeats": {
        "axis": "Y",
        "count": 5,
        "step": 3
      },
      "connections": [
        "22222222-2222-4222-8222-222222222222"
      ],
      "params": {
        "floors": 5,
        "floorH": 3,
        "basement": 0,
        "shaftW": 2.4,
        "shaftD": 5.2,
        "stairType": "switchback",
        "doorW": 900,
        "doorH": 2100,
        "doorPos": "front",
        "supply": "bottom",
        "dp": 50
      }
    }
  ],
  "meta": {
    "author": "engineers.ge",
    "description": "Round-trip validation fixture",
    "dxfSource": "fixture.dxf"
  }
}
```

## Runtime Helpers

- `validateBuilding(raw)` — parse ან bilingual error throw
- `validateModule(raw)` — module-level parse
- `createEmptyBuilding(name)` — ახალი building envelope
- `createModule(type, override?)` — sane defaults თითოეულ module type-ზე
- `addModule/removeModule/updateModule()` — immutable helpers
- `findConnected(building, id)` — adjacency lookup
- `diffModules(prev, next)` — added / removed / updated / unchanged split
- `validateFixtures()` — fixture-based schema + round-trip check
