/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ghost_split.json`.
 */
export type GhostSplit = {
  "address": "BtXL4LiVwtNYTcxyz5TMNgcYkPzdcrxtESSpNYCaenJc",
  "metadata": {
    "name": "ghostSplit",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "GhostSplit — group expenses on MagicBlock Ephemeral Rollups + private USDC settlement"
  },
  "instructions": [
    {
      "name": "addExpense",
      "discriminator": [
        171,
        23,
        8,
        240,
        62,
        31,
        254,
        144
      ],
      "accounts": [
        {
          "name": "group"
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "expense",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  112,
                  101,
                  110,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "group"
              },
              {
                "kind": "account",
                "path": "ledger.expense_count",
                "account": "groupLedger"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "splitBetween",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "closeGroup",
      "discriminator": [
        40,
        187,
        201,
        187,
        18,
        194,
        122,
        232
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "group"
          ]
        },
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "commitGroupLedger",
      "docs": [
        "Step 2 (ER, optional): snapshot current ER state to base mid-session."
      ],
      "discriminator": [
        104,
        110,
        236,
        9,
        179,
        249,
        132,
        83
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "group"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createGroup",
      "discriminator": [
        79,
        60,
        158,
        134,
        61,
        199,
        56,
        248
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "group",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  114,
                  111,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "groupId"
              }
            ]
          }
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "groupId",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "currency",
          "type": {
            "defined": {
              "name": "currency"
            }
          }
        }
      ]
    },
    {
      "name": "delegateGroupLedger",
      "docs": [
        "ER lifecycle",
        "Step 1 (base): delegate GroupLedger to ER. Blocks join_group until undelegated."
      ],
      "discriminator": [
        50,
        105,
        227,
        192,
        160,
        187,
        130,
        4
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferLedger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "ledger"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                161,
                199,
                200,
                125,
                44,
                161,
                80,
                59,
                6,
                92,
                145,
                254,
                95,
                85,
                144,
                121,
                129,
                88,
                198,
                5,
                220,
                169,
                148,
                230,
                136,
                74,
                68,
                102,
                140,
                15,
                139,
                73
              ]
            }
          }
        },
        {
          "name": "delegationRecordLedger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "ledger"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataLedger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "ledger"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "BtXL4LiVwtNYTcxyz5TMNgcYkPzdcrxtESSpNYCaenJc"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "validator",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "finalizeUndelegate",
      "docs": [
        "Step 3b (base): clear is_delegated after undelegation completes."
      ],
      "discriminator": [
        207,
        137,
        78,
        165,
        131,
        136,
        142,
        250
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "ledger",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "joinGroup",
      "discriminator": [
        121,
        56,
        199,
        19,
        250,
        70,
        44,
        184
      ],
      "accounts": [
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "member",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "markSettled",
      "discriminator": [
        85,
        36,
        192,
        146,
        83,
        42,
        49,
        60
      ],
      "accounts": [
        {
          "name": "group"
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "removeExpense",
      "discriminator": [
        19,
        156,
        145,
        30,
        193,
        192,
        182,
        215
      ],
      "accounts": [
        {
          "name": "group"
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "expense",
          "writable": true
        },
        {
          "name": "expensePayer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "undelegateGroupLedger",
      "docs": [
        "Step 3a (ER): commit final state and end the ER session."
      ],
      "discriminator": [
        72,
        69,
        58,
        223,
        233,
        243,
        142,
        253
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "ledger",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  114,
                  95,
                  108,
                  101,
                  100,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "group"
              }
            ]
          }
        },
        {
          "name": "group"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "expense",
      "discriminator": [
        49,
        167,
        206,
        160,
        209,
        254,
        24,
        100
      ]
    },
    {
      "name": "group",
      "discriminator": [
        209,
        249,
        208,
        63,
        182,
        89,
        186,
        254
      ]
    },
    {
      "name": "groupLedger",
      "discriminator": [
        145,
        95,
        118,
        143,
        122,
        235,
        176,
        186
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "groupFull",
      "msg": "Group is full (max 10 members)"
    },
    {
      "code": 6001,
      "name": "notMember",
      "msg": "Not a group member"
    },
    {
      "code": 6002,
      "name": "alreadySettled",
      "msg": "Group already settled"
    },
    {
      "code": 6003,
      "name": "nameTooLong",
      "msg": "Name too long"
    },
    {
      "code": 6004,
      "name": "descriptionTooLong",
      "msg": "Description too long"
    },
    {
      "code": 6005,
      "name": "alreadyMember",
      "msg": "Already a member"
    },
    {
      "code": 6006,
      "name": "expenseDescTooLong",
      "msg": "Expense description too long"
    },
    {
      "code": 6007,
      "name": "emptySplit",
      "msg": "Invalid split: must include at least one member"
    },
    {
      "code": 6008,
      "name": "splitNotMember",
      "msg": "Split member is not in the group"
    },
    {
      "code": 6009,
      "name": "splitTooMany",
      "msg": "Too many people in split"
    },
    {
      "code": 6010,
      "name": "payerNotMember",
      "msg": "Payer is not a group member"
    },
    {
      "code": 6011,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6012,
      "name": "ledgerMismatch",
      "msg": "Ledger does not match this group"
    },
    {
      "code": 6013,
      "name": "alreadyDelegated",
      "msg": "Group ledger is already delegated to the ER; call finalize_undelegate first"
    },
    {
      "code": 6014,
      "name": "notDelegated",
      "msg": "Group ledger is not currently delegated"
    },
    {
      "code": 6015,
      "name": "notExpensePayer",
      "msg": "Only the expense payer can remove this expense"
    }
  ],
  "types": [
    {
      "name": "currency",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sol"
          },
          {
            "name": "usdc"
          }
        ]
      }
    },
    {
      "name": "expense",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "group",
            "type": "pubkey"
          },
          {
            "name": "paidBy",
            "type": "pubkey"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "splitBetween",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "index",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "group",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "members",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "currency",
            "type": {
              "defined": {
                "name": "currency"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "isDelegated",
            "docs": [
              "True while GroupLedger is on the ER. Route add_expense / mark_settled",
              "to the ER RPC when set. join_group is blocked to prevent sync issues."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "groupLedger",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "group",
            "type": "pubkey"
          },
          {
            "name": "memberBalances",
            "type": {
              "vec": "i64"
            }
          },
          {
            "name": "expenseCount",
            "type": "u32"
          },
          {
            "name": "isSettled",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
