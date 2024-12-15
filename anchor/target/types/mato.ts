/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/mato.json`.
 */
export type Mato = {
  address: "9BiMFA2PjRTUQ3aDy3Yr8EetY8Hx6iUccbakxWeC4LHR";
  metadata: {
    name: "mato";
    version: "0.1.0";
    spec: "0.1.0";
    description: "A new market structure";
  };
  instructions: [
    {
      name: "closeMarket";
      discriminator: [88, 154, 248, 186, 48, 14, 123, 244];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "closePositionA";
      discriminator: [14, 20, 236, 87, 227, 25, 137, 101];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "signerTokenAccountA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "signer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintA";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "signerTokenAccountB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "signer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintB";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "tokenMintA";
          writable: true;
        },
        {
          name: "tokenMintB";
          writable: true;
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "positionA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 111, 115, 105, 116, 105, 111, 110, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
              {
                kind: "account";
                path: "signer";
              },
              {
                kind: "account";
                path: "position_a.id";
                account: "positionA";
              },
            ];
          };
        },
        {
          name: "treasuryA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "treasuryB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "closePositionB";
      discriminator: [230, 101, 198, 115, 245, 248, 45, 218];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "signerTokenAccountA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "signer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintA";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "signerTokenAccountB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "signer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintB";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "tokenMintA";
          writable: true;
        },
        {
          name: "tokenMintB";
          writable: true;
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "positionB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 111, 115, 105, 116, 105, 111, 110, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
              {
                kind: "account";
                path: "signer";
              },
              {
                kind: "account";
                path: "position_b.id";
                account: "positionB";
              },
            ];
          };
        },
        {
          name: "treasuryA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "treasuryB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "depositTokenA";
      discriminator: [70, 68, 89, 108, 186, 230, 50, 20];
      accounts: [
        {
          name: "depositor";
          writable: true;
          signer: true;
        },
        {
          name: "depositorTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "depositor";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintA";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "tokenMintA";
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "positionA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 111, 115, 105, 116, 105, 111, 110, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
              {
                kind: "account";
                path: "depositor";
              },
              {
                kind: "arg";
                path: "id";
              },
            ];
          };
        },
        {
          name: "treasuryA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "id";
          type: "u64";
        },
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "duration";
          type: "u64";
        },
      ];
    },
    {
      name: "depositTokenB";
      discriminator: [224, 215, 253, 240, 169, 119, 20, 227];
      accounts: [
        {
          name: "depositor";
          writable: true;
          signer: true;
        },
        {
          name: "depositorTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "depositor";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintB";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "tokenMintB";
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "positionB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 111, 115, 105, 116, 105, 111, 110, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
              {
                kind: "account";
                path: "depositor";
              },
              {
                kind: "arg";
                path: "id";
              },
            ];
          };
        },
        {
          name: "treasuryB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "id";
          type: "u64";
        },
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "duration";
          type: "u64";
        },
      ];
    },
    {
      name: "initializeBooks";
      discriminator: [13, 18, 221, 245, 238, 90, 155, 116];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "initializeMarket";
      discriminator: [35, 35, 189, 193, 155, 48, 170, 203];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "tokenMintA";
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "treasuryA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "startSlot";
          type: "u64";
        },
        {
          name: "endSlotInterval";
          type: "u64";
        },
      ];
    },
    {
      name: "initializeTreasury";
      discriminator: [124, 186, 211, 195, 85, 165, 129, 166];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "tokenMintB";
        },
        {
          name: "market";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "treasuryB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
        },
        {
          name: "prices";
        },
        {
          name: "overflows";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "updateBookkeeping";
      discriminator: [222, 56, 94, 92, 246, 119, 169, 157];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "updateBookkeepingTill";
      discriminator: [135, 65, 10, 9, 229, 101, 171, 133];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "slot";
          type: "u64";
        },
      ];
    },
    {
      name: "withdrawSwappedTokenA";
      discriminator: [219, 231, 4, 162, 65, 138, 99, 148];
      accounts: [
        {
          name: "withdrawer";
          writable: true;
          signer: true;
        },
        {
          name: "withdrawerTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "withdrawer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintA";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "tokenMintA";
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "positionB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 111, 115, 105, 116, 105, 111, 110, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
              {
                kind: "account";
                path: "withdrawer";
              },
              {
                kind: "account";
                path: "position_b.id";
                account: "positionB";
              },
            ];
          };
        },
        {
          name: "treasuryA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "withdrawSwappedTokenB";
      discriminator: [135, 201, 30, 197, 157, 4, 17, 74];
      accounts: [
        {
          name: "withdrawer";
          writable: true;
          signer: true;
        },
        {
          name: "withdrawerTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "withdrawer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "tokenMintB";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "tokenMintB";
        },
        {
          name: "market";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: "account";
                path: "exits";
              },
              {
                kind: "account";
                path: "prices";
              },
              {
                kind: "account";
                path: "overflows";
              },
            ];
          };
        },
        {
          name: "positionA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 111, 115, 105, 116, 105, 111, 110, 95, 97];
              },
              {
                kind: "account";
                path: "market";
              },
              {
                kind: "account";
                path: "withdrawer";
              },
              {
                kind: "account";
                path: "position_a.id";
                account: "positionA";
              },
            ];
          };
        },
        {
          name: "treasuryB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [116, 114, 101, 97, 115, 117, 114, 121, 95, 98];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "bookkeeping";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 111, 111, 107, 107, 101, 101, 112, 105, 110, 103];
              },
              {
                kind: "account";
                path: "market";
              },
            ];
          };
        },
        {
          name: "exits";
          writable: true;
        },
        {
          name: "prices";
          writable: true;
        },
        {
          name: "overflows";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: "bookkeeping";
      discriminator: [222, 183, 70, 70, 180, 109, 184, 251];
    },
    {
      name: "exits";
      discriminator: [240, 175, 85, 167, 2, 200, 2, 180];
    },
    {
      name: "market";
      discriminator: [219, 190, 213, 55, 0, 227, 198, 154];
    },
    {
      name: "overflows";
      discriminator: [221, 30, 107, 150, 183, 77, 216, 42];
    },
    {
      name: "positionA";
      discriminator: [115, 100, 243, 3, 118, 209, 212, 78];
    },
    {
      name: "positionB";
      discriminator: [63, 224, 139, 42, 212, 119, 253, 67];
    },
    {
      name: "prices";
      discriminator: [74, 25, 25, 70, 56, 98, 39, 21];
    },
  ];
  errors: [
    {
      code: 6000;
      name: "endSlotAlreadyPassed";
      msg: "End slot has already passed";
    },
    {
      code: 6001;
      name: "accountTooSmall";
      msg: "Account is too small";
    },
    {
      code: 6002;
      name: "invalidSlotInterval";
      msg: "Slot interval has to be power of 10";
    },
    {
      code: 6003;
      name: "depositTooSmall";
      msg: "Deposit amount is too small";
    },
    {
      code: 6004;
      name: "noTokensSwapped";
      msg: "No tokens have been swapped yet";
    },
    {
      code: 6005;
      name: "positionAlreadyEnded";
      msg: "Position already ended. Close position instead.";
    },
  ];
  types: [
    {
      name: "bookkeeping";
      type: {
        kind: "struct";
        fields: [
          {
            name: "aPerB";
            type: "u64";
          },
          {
            name: "bPerA";
            type: "u64";
          },
          {
            name: "noTradeSlots";
            type: "u64";
          },
          {
            name: "lastSlot";
            type: "u64";
          },
          {
            name: "overflowsAPerB";
            type: "u64";
          },
          {
            name: "overflowsBPerA";
            type: "u64";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "exits";
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "tokenA";
            type: {
              array: ["u64", 420000];
            };
          },
          {
            name: "tokenB";
            type: {
              array: ["u64", 420000];
            };
          },
          {
            name: "pointer";
            type: "u64";
          },
          {
            name: "startSlot";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "market";
      type: {
        kind: "struct";
        fields: [
          {
            name: "tokenAVolume";
            type: "u64";
          },
          {
            name: "tokenBVolume";
            type: "u64";
          },
          {
            name: "endSlotInterval";
            type: "u64";
          },
          {
            name: "startSlot";
            type: "u64";
          },
          {
            name: "endSlot";
            type: {
              option: "u64";
            };
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "overflows";
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "aPerB";
            type: {
              array: ["u64", 420000];
            };
          },
          {
            name: "bPerA";
            type: {
              array: ["u64", 420000];
            };
          },
        ];
      };
    },
    {
      name: "positionA";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "id";
            type: "u64";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "startSlot";
            type: "u64";
          },
          {
            name: "endSlot";
            type: "u64";
          },
          {
            name: "bookkeeping";
            type: "u64";
          },
          {
            name: "noTradeSlots";
            type: "u64";
          },
          {
            name: "totalNoTrades";
            type: "u64";
          },
          {
            name: "overflows";
            type: "u64";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "positionB";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "id";
            type: "u64";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "startSlot";
            type: "u64";
          },
          {
            name: "endSlot";
            type: "u64";
          },
          {
            name: "bookkeeping";
            type: "u64";
          },
          {
            name: "noTradeSlots";
            type: "u64";
          },
          {
            name: "totalNoTrades";
            type: "u64";
          },
          {
            name: "overflows";
            type: "u64";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "prices";
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "aPerB";
            type: {
              array: ["u64", 420000];
            };
          },
          {
            name: "bPerA";
            type: {
              array: ["u64", 420000];
            };
          },
          {
            name: "noTradeSlots";
            type: {
              array: ["u64", 420000];
            };
          },
        ];
      };
    },
  ];
  constants: [
    {
      name: "seed";
      type: "string";
      value: '"anchor"';
    },
  ];
};
