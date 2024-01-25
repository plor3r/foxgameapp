import {
  NETWORK,
  MovescriptionPackageId,
  FoxGamePackageId,
  OriginFoxGamePackageId,
  FoxGameGlobal,
  MovescriptionTicketRecordId,
  EggTreasuryCap,
} from "../config";
import { useState, useEffect } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
  useCurrentWallet,
  useSuiClient,
} from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';


export default function Game() {
  const account = useCurrentAccount();
  const { isConnected } = useCurrentWallet();
  const { mutate: signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();

  const [mintTx, setMintTx] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const [stakeTx, setStakeTx] = useState('');
  const [isStaking, setIsStaking] = useState(false);

  const [unstakeTx, setUnstakeTx] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);

  const [moveTx, setMoveTx] = useState('');
  const [isMintingMove, setIsMintingMove] = useState(false);
  const [isBurning, setIsBurning] = useState(false);

  const [moveAmount, setMoveAmount] = useState(0);

  const [cost, setCost] = useState(0);

  const MAX_TOKEN = 2000;
  const PAID_TOKENS = 20000;
  const SingleMintPrice = 10000;

  const [unstakedFox, setUnstakedFox] = useState<Array<{ objectId: string, index: number, url: string, is_chicken: boolean }>>([]);
  const [unstakedChicken, setUnstakedChicken] = useState<Array<{ objectId: string, index: number, url: string, is_chicken: boolean }>>([]);
  const [collectionSupply, setCollectionSupply] = useState(0);
  const [mintAmount, setMintAmount] = useState(1);
  const [eggBalance, setEggBalance] = useState(0);
  const [unstakedSelected, setUnstakedSelected] = useState<Array<string>>([])

  const [barnStakedObject, setBarnStakedObject] = useState<string>('')
  const [packStakedObject, setPackStakedObject] = useState<string>('')

  const [stakedChicken, setStakedChicken] = useState<Array<{ objectId: string, index: number, url: string }>>([]);
  const [stakedFox, setStakedFox] = useState<Array<{ objectId: string, index: number, url: string }>>([]);
  const [stakedSelected, setStakedSelected] = useState<Array<string>>([]);

  const [_suiCost, setSuiCost] = useState<bigint>(BigInt(0));
  const [_eggCost, setEggCost] = useState<bigint>(BigInt(0));

  // const [insufficientBalance, setInsufficientBalance] = useState(false);

  const client = useSuiClient();

  function check_if_connected() {
    if (!isConnected) {
      alert("Please connect wallet first")
    }
  }

  function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  async function fetch_movescription_amount() {
    let hasNextPage = true;
    let allObjects: any[] = []
    while (hasNextPage) {
      const objects = await client.getOwnedObjects({
        owner: account!.address,
        filter: {
          MatchAll: [
            {
              StructType: `${MovescriptionPackageId}::movescription::Movescription`,
            },
            {
              AddressOwner: account!.address,
            }
          ]
        },
        options: {
          showContent: true
        }
      })
      allObjects = allObjects.concat(objects.data)
      hasNextPage = objects.hasNextPage
    }
    let totalAmount = allObjects.map((c: any) => parseInt(c.data.content.fields.amount))
      .reduce((sum, current) => sum + current);
    setMoveAmount(totalAmount)
  }

  async function fetch_movescription_greater_than(amount: any): Promise<[any, number]> {
    const objects = await client.getOwnedObjects({
      owner: account!.address,
      filter: {
        MatchAll: [
          {
            StructType: `${MovescriptionPackageId}::movescription::Movescription`,
          },
          {
            AddressOwner: account!.address,
          }
        ]
      },
      options: {
        showContent: true
      }
    })
    let totalAmount = 0;
    let objectIds = []
    for (let index = 0; index < objects.data.length; index++) {
      const element: any = objects.data[index];
      objectIds.push(element.data.objectId)
      totalAmount += parseInt(element.data.content.fields.amount)
      if (totalAmount >= amount) break
    }
    if (totalAmount < amount) {
      return [[], 0]
    }
    return [objectIds, totalAmount]
  }

  async function mint_movescription() {
    setIsMintingMove(true)
    const txb = new TransactionBlock();
    // == deposit
    const mint_fee = 0.1 * 1_000_000_000;
    const [coin] = txb.splitCoins(txb.gas, [mint_fee]);
    txb.moveCall({
      target: `${MovescriptionPackageId}::movescription::mint`,
      arguments: [txb.object(MovescriptionTicketRecordId), txb.pure("MOVE"), coin, txb.object('0x6')],
    });
    signAndExecuteTransactionBlock(
      {
        transactionBlock: txb,
      },
      {
        onSuccess: (result) => {
          console.log('executed transaction block', result);
          setMoveTx(`https://suiexplorer.com/txblock/${result.digest}`);
          setUnstakedSelected([])
          setIsMintingMove(false)
        },
        onError: (error) => {
          console.log(error);
          setIsMintingMove(false)
        },
        onSettled: (data) => {
          console.log(data);
          setIsMintingMove(false)
        }
      },
    );
  }

  async function mint_nft() {
    setIsMinting(true)
    const [objects, totalAmount] = await fetch_movescription_greater_than(mintAmount * 10000);
    const txb = new TransactionBlock();

    const inscription_id = objects[0]
    if (objects.length > 1) {
      for (let index = 1; index < objects.length; index++) {
        const ins_id = objects[index];
        txb.moveCall({
          target: `${MovescriptionPackageId}::movescription::merge`,
          arguments: [txb.object(inscription_id), txb.object(ins_id)],
        });
      }
    }
    // == deposit
    let move;
    if (totalAmount > mintAmount * 10000) {
      [move] = txb.moveCall({
        target: `${MovescriptionPackageId}::movescription::do_split`,
        arguments: [txb.object(inscription_id), txb.pure(mintAmount * 10000)],
      });
    } else {
      move = inscription_id
    }
    txb.moveCall({
      target: `${FoxGamePackageId}::fox::mint`,
      arguments: [
        txb.object(FoxGameGlobal),
        txb.pure(mintAmount),
        txb.pure(false),
        txb.object(move),
        txb.object('0x6')
      ],
    });
    txb.setGasBudget(300_000_000 * mintAmount)
    signAndExecuteTransactionBlock(
      {
        transactionBlock: txb,
      },
      {
        onSuccess: (result) => {
          console.log('executed transaction block', result);
          setMintTx(`https://suiexplorer.com/txblock/${result.digest}`);
          setIsMinting(false);
        },
        onError: (error) => {
          console.log(error);
          setIsMinting(false);
        },
        onSettled: (data) => {
          console.log(data);
          setIsMinting(false);
        }
      },
    );
  }

  async function burn_nft() {
    setIsBurning(true)
    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${FoxGamePackageId}::fox::burn_many`,
      arguments: [
        txb.object(FoxGameGlobal),
        txb.makeMoveVec({ objects: unstakedSelected.map((item: any) => txb.object(item)) }),
      ],
    });
    signAndExecuteTransactionBlock(
      {
        transactionBlock: txb,
      },
      {
        onSuccess: (result) => {
          console.log('executed transaction block', result);
          setMintTx(`https://suiexplorer.com/txblock/${result.digest}`);
          setUnstakedSelected([])
          setIsBurning(false)
        },
        onError: (error) => {
          console.log(error);
          setUnstakedSelected([])
          setIsBurning(false)
        },
        onSettled: (data) => {
          console.log(data);
          setUnstakedSelected([])
          setIsBurning(false)
        }
      },
    );
  }

  async function stake_nft() {
    setIsStaking(true)
    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${FoxGamePackageId}::fox::add_many_to_barn_and_pack`,
      arguments: [
        txb.object(FoxGameGlobal),
        txb.makeMoveVec({ objects: unstakedSelected.map(item => txb.object(item)) }),
        txb.object('0x6'),
      ],
    });
    signAndExecuteTransactionBlock(
      {
        transactionBlock: txb,
      },
      {
        onSuccess: (result) => {
          console.log('executed transaction block', result);
          setStakeTx(`https://suiexplorer.com/txblock/${result.digest}`);
          setUnstakedSelected([])
          setIsStaking(false)
        },
        onError: (error) => {
          console.log(error);
          setUnstakedSelected([])
          setIsStaking(false)
        },
        onSettled: (data) => {
          console.log(data);
          setUnstakedSelected([])
          setIsStaking(false)
        }
      },
    );
  }

  async function unstake_nft() {
    check_if_connected()
    setIsUnstaking(true)
    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${FoxGamePackageId}::fox::claim_many_from_barn_and_pack`,
      arguments: [
        txb.object(FoxGameGlobal),
        txb.object(EggTreasuryCap),
        txb.pure(stakedSelected),
        txb.pure(true),
        txb.object('0x6'),
      ],
    });
    signAndExecuteTransactionBlock(
      {
        transactionBlock: txb,
      },
      {
        onSuccess: (result) => {
          console.log('executed transaction block', result);
          setUnstakeTx(`https://suiexplorer.com/txblock/${result.digest}`);
          setStakedSelected([])
          setIsUnstaking(false)
        },
        onError: (error) => {
          console.log(error);
          setStakedSelected([])
          setIsUnstaking(false)
        },
        onSettled: (data) => {
          console.log(data);
          setStakedSelected([])
          setIsUnstaking(false)
        }
      },
    );
  }

  async function claim_egg() {
    check_if_connected()
    setIsClaiming(true)
    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${FoxGamePackageId}::fox::claim_many_from_barn_and_pack`,
      arguments: [
        txb.object(FoxGameGlobal),
        txb.object(EggTreasuryCap),
        txb.pure(stakedSelected),
        txb.pure(false),
        txb.object('0x6'),
      ],
      // typeArguments: [`${OriginFoxGamePackageId}::egg::EGG`]
    });
    signAndExecuteTransactionBlock(
      {
        transactionBlock: txb,
      },
      {
        onSuccess: (result) => {
          console.log('executed transaction block', result);
          // setUnstakeTx(`https://suiexplorer.com/txblock/${result.digest}`);
          setStakedSelected([])
          setIsClaiming(false)
        },
        onError: (error) => {
          console.log(error);
          setStakedSelected([])
          setIsClaiming(false)
        },
        onSettled: (data) => {
          console.log(data);
          setStakedSelected([])
          setIsClaiming(false)
        }
      },
    );
  }

  async function getCollectionSupply() {
    const globalObject: any = await client.getObject({ id: FoxGameGlobal, options: { showContent: true } })
    const focRegistry = globalObject.data.content.fields.foc_registry
    setCollectionSupply(parseInt(focRegistry.fields.foc_born))
  }

  useEffect(() => {
    if (collectionSupply < PAID_TOKENS) {
      setSuiCost(BigInt(SingleMintPrice * mintAmount))
      setEggCost(BigInt(0))
      setCost(SingleMintPrice * mintAmount)
    } else if (collectionSupply <= MAX_TOKEN * 2 / 5) {
      setSuiCost(BigInt(0))
      setEggCost(BigInt(1.1 * SingleMintPrice * mintAmount))
      setCost(1.1 * SingleMintPrice * mintAmount)
    } else if (collectionSupply <= MAX_TOKEN * 4 / 5) {
      setSuiCost(BigInt(0))
      setEggCost(BigInt(1.2 * SingleMintPrice * mintAmount))
      setCost(1.2 * SingleMintPrice * mintAmount)
    } else {
      setSuiCost(BigInt(0))
      setEggCost(BigInt(1.4 * SingleMintPrice * mintAmount))
      setCost(1.4 * SingleMintPrice * mintAmount)
    }
  }, [collectionSupply, mintAmount]);

  useEffect(() => {
    const fetchData = async () => {
      await getCollectionSupply();
    }
    fetchData()
    const fetchMovescription = async () => {
      await fetch_movescription_amount()
    }
    fetchMovescription()
    const interval = setInterval(() => {
      fetchData()
    }, 10000)
    return () => clearInterval(interval)
  });

  useEffect(() => {
    const fetchData = async () => {
      await getCollectionSupply();
    }
    fetchData()
    const fetchMovescription = async () => {
      await fetch_movescription_amount()
    }
    fetchMovescription()
  }, [mintTx, moveTx]);

  // get unstaked fox or chicken
  useEffect(() => {
    if (isConnected) {
      (async () => {
        const objects = await client.getOwnedObjects({
          owner: account!.address,
          filter: {
            MatchAll: [
              {
                StructType: `${OriginFoxGamePackageId}::token::FoxOrChicken`,
              },
              {
                AddressOwner: account!.address,
              }
            ]
          },
          options: {
            showDisplay: true,
            showContent: true,
          },
        })
        const unstaked = objects.data.map((item: any) => {
          return {
            objectId: item.data.objectId,
            index: parseInt(item.data.content.fields.index),
            url: item.data.display.data.image_url,
            is_chicken: item.data.content.fields.is_chicken,
          }
        }).sort((n1, n2) => n1.index - n2.index)
        setUnstakedFox(unstaked.filter(item => !item.is_chicken))
        setUnstakedChicken(unstaked.filter(item => item.is_chicken))
      })()
    } else {
      setUnstakedFox([])
      setUnstakedChicken([])
    }
  }, [isConnected, mintTx, stakeTx, unstakeTx])

  // get globla object
  useEffect(() => {
    (async () => {
      const globalObject: any = await client.getObject({ id: FoxGameGlobal, options: { showContent: true } })
      const barn_staked = globalObject.data.content.fields.barn.fields.id.id
      setBarnStakedObject(barn_staked)

      const pack_staked = globalObject.data.content.fields.pack.fields.id.id
      setPackStakedObject(pack_staked)
    })()
  })

  // get bark.staked object
  useEffect(() => {
    if (barnStakedObject !== '' && account !== null) {
      (async () => {
        try {
          const dfObject: any = await client.getDynamicFieldObject({ parentId: barnStakedObject, name: { type: 'address', value: account!.address } })
          if (dfObject.error) {
            return
          }
          const chicken_staked = dfObject.data.content.fields.value
          const chicken_stakes = await client.multiGetObjects({ ids: chicken_staked, options: { showContent: true } })
          const staked = chicken_stakes.map((item: any) => {
            let foc = item.data.content.fields.item
            return {
              objectId: foc.fields.id.id,
              index: parseInt(foc.fields.index),
              url: foc.fields.url,
            }
          })
          setStakedChicken(staked)
        }
        catch (e) {
          setStakedChicken([])
          console.log(e)
        }
      })()
    }
  }, [isConnected, barnStakedObject, mintTx, stakeTx, unstakeTx])

  // get pack.staked object
  useEffect(() => {
    if (packStakedObject !== '' && account !== null) {
      (async () => {
        try {
          const dfObject: any = await client.getDynamicFieldObject({ parentId: packStakedObject, name: { type: 'address', value: account!.address } })
          if (dfObject.error) {
            return
          }
          const fox_staked = dfObject.data.content.fields.value
          const fox_stakes = await client.multiGetObjects({ ids: fox_staked, options: { showContent: true } })
          const staked = fox_stakes.map((item: any) => {
            let foc = item.data.content.fields.item
            return {
              objectId: foc.fields.id.id,
              index: parseInt(foc.fields.index),
              url: foc.fields.url,
            }
          })
          setStakedFox(staked)
        }
        catch (e) {
          setStakedFox([])
          console.log(e)
        }
      })()
    }
  }, [isConnected, packStakedObject, mintTx, stakeTx, unstakeTx])

  // get egg balance
  useEffect(() => {
    if (isConnected) {
      (async () => {
        // const balanceObjects = await sui_client.getBalance(account!.address, `${FoxGamePackageId}::egg::EGG`)
        // console.log(balanceObjects)
        const balanceObjects = await client.getBalance({ owner: account!.address, coinType: `${FoxGamePackageId}::egg::EGG` })
        console.log(balanceObjects)
        // const balances = balanceObjects.filter(item => item.status === 'Exists').map((item: any) => parseInt(item.details.data.fields.balance))
        // const initialValue = 0;
        // const sumWithInitial = balances.reduce(
        //   (accumulator, currentValue) => accumulator + currentValue,
        //   initialValue
        // )
        setEggBalance(parseInt(balanceObjects.totalBalance));
      })()
    }
  }, [isConnected, unstakeTx])

  function addStaked(item: string) {
    setUnstakedSelected([])
    setStakedSelected([...stakedSelected, item])
  }

  function removeStaked(item: string) {
    setUnstakedSelected([])
    setStakedSelected(stakedSelected.filter(i => i !== item))
  }

  function addUnstaked(item: string) {
    setStakedSelected([])
    setUnstakedSelected([...unstakedSelected, item])
  }

  function removeUnstaked(item: string) {
    setStakedSelected([])
    setUnstakedSelected(unstakedSelected.filter(i => i !== item))
  }

  function renderUnstaked(item: any, _type: string) {
    const itemIn = unstakedSelected.includes(item.objectId);
    return <div key={item.objectId} style={{ marginRight: "5px", marginLeft: "5px", border: itemIn ? "2px solid red" : "2px solid rgb(0,0,0,0)", overflow: 'hidden', display: "inline-block" }}>
      <div className="flex flex-col items-center">
        <div style={{ fontSize: "0.75rem", height: "1rem" }}>#{item.index}</div>
        <img src={`${item.url}`} width={48} height={48} alt={`${item.objectId}`} onClick={() => itemIn ? removeUnstaked(item.objectId) : addUnstaked(item.objectId)} />
      </div>
    </div>
  }

  function renderStaked(item: any, _type: string) {
    const itemIn = stakedSelected.includes(item.objectId);
    return <div key={item.objectId} style={{ marginRight: "5px", marginLeft: "5px", border: itemIn ? "2px solid red" : "2px solid rgb(0,0,0,0)", overflow: 'hidden', display: "inline-block" }}>
      <div className="flex flex-col items-center">
        <div style={{ fontSize: "0.75rem", height: "1rem" }}>#{item.index}</div>
        <img src={`${item.url}`} width={48} height={48} alt={`${item.objectId}`} onClick={() => itemIn ? removeStaked(item.objectId) : addStaked(item.objectId)} />
      </div>
    </div>
  }

  return (
    <div style={{ paddingTop: '1px' }}>
      <div className="text-center"><span className="mb-5 text-center title">Fox Game</span>
        {/* {NETWORK === "mainnet" ? <span className="cursor-pointer ml-2 text-red title-upper" style={{ fontSize: "18px", verticalAlign: "100%" }}>Sui</span> */}
        <span className="cursor-pointer ml-2 text-red title-upper" style={{ fontSize: "18px", verticalAlign: "100%" }}>{NETWORK}</span>
      </div>
      <div className="flex flex-wrap items-center space-x-2 justify-center">
        <div className="mb-5 text-sm font-console basis-2/5" style={{ minWidth: '480px' }}>
          <div className="relative flex justify-center w-full h-full p-1 overflow-hidden md:p-5" style={{ borderImage: "url('/wood-frame.svg') 30 / 1 / 0 stretch", borderWidth: "30px", background: "rgb(237, 227, 209)" }}>
            <div className="absolute wood-mask"></div>
            <div className="relative w-full h-full z-index:5">
              <div className="flex flex-col items-center">
                <div className="text-center font-console pt-1 text-red text-2xl">MINTING</div>
                <div className="h-4"></div>
                <div className="gen">
                  <div className="flex flex-row justify-between w-full" style={{ maxHeight: "36px" }}>
                    <span style={{ borderRight: "4px solid #000000", width: "100%" }} className="flex-initial">GEN 0</span>
                    {/* <span style={{ borderRight: "4px solid #000000", width: "20%" }} className="flex-initial">11000 $MOVE</span>
                    <span style={{ borderRight: "4px solid #000000", width: "40%" }} className="flex-initial">12000 $MOVE</span>
                    <span className="flex-initial" style={{ width: "20%" }}>14000 $MOVE</span> */}
                  </div>
                  <div className="progress-bar" style={{ width: `${collectionSupply / MAX_TOKEN * 100}%` }}></div>
                </div>
                <div className="h-2"></div>
                <div><span className="text-xl"><span className="text-red">{numberWithCommas(collectionSupply)}</span> / {numberWithCommas(MAX_TOKEN)} MINTED</span></div>
                <div className="h-4"></div>
                <div>
                  <span className="text-black text-xl">AMOUNT</span>
                  <i className="text-red arrow down cursor-pointer ml-2 mr-2" onClick={() => setMintAmount(Math.max(1, mintAmount - 1))}></i>
                  <span className="text-red text-2xl">{mintAmount}</span>
                  <i className="text-red arrow up cursor-pointer ml-2" onClick={() => setMintAmount(Math.min(10, mintAmount + 1))}></i>
                </div>
                <div className="h-2"></div>
                <div><span className="text-black text-xl">COST: </span><span className="text-red text-xl">{numberWithCommas(cost)} MOVE</span></div>
                <div className="h-4"></div>
                <div className="flex flex-row space-x-4">
                  <div className="relative flex items-center justify-center cursor-pointer false hover:bg-gray-200 active:bg-gray-400"
                    style={{ userSelect: "none", width: "200px", borderImage: "url('./wood-frame.svg') 5 / 1 / 0 stretch", borderWidth: "10px" }}
                    onClick={mint_nft}
                  >
                    <div className="text-center font-console pt-1" >
                      {isMinting ?
                        <div className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                        : <span>Mint</span>}
                    </div>
                  </div>
                  {/* <div className="relative flex items-center justify-center cursor-pointer false hover:bg-gray-200 active:bg-gray-400"
                    style={{ userSelect: "none", width: "200px", borderImage: "url('./wood-frame.svg') 5 / 1 / 0 stretch", borderWidth: "10px" }}
                    onClick={mint_nft_stake}
                  >
                    <div className="text-center font-console pt-1" >Mint & Stake</div>
                  </div> */}
                  <div className="relative flex items-center justify-center cursor-pointer false hover:bg-gray-200 active:bg-gray-400"
                    style={{ userSelect: "none", width: "200px", borderImage: "url('./wood-frame.svg') 5 / 1 / 0 stretch", borderWidth: "10px" }}
                    onClick={mint_movescription}
                  >
                    <div className="text-center font-console pt-1" >
                      {isMintingMove ?
                        <div className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                        : <span>Mint test MOVE</span>}
                    </div>
                  </div>
                </div>
                <div className="h-4"></div>
                <div className="flex flex-row space-x-4">
                  <div className="text-black text-lg">Your $MOVE amount: <span className="text-red">{numberWithCommas(moveAmount)}</span> MOVE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-5 text-sm font-console basis-2/5" style={{ minWidth: '480px' }}>
          <div className="relative flex justify-center w-full h-full p-1 overflow-hidden md:p-5" style={{ borderImage: "url('./wood-frame.svg') 30 / 1 / 0 stretch", borderWidth: "30px", background: "rgb(237, 227, 209)" }}>
            <div className="absolute wood-mask"></div>
            <div className="relative w-full h-full z-index:5">
              <div className="flex flex-col items-center">
                <div className="text-center font-console pt-1 text-xl">$EGG in your wallet: <span className="text-red">{numberWithCommas((eggBalance % 1000000000))}</span> EGG</div>
                <div className="h-4"></div>
                <div className="text-center font-console pt-1 text-red text-2xl">UNSTAKED</div>
                <div className="h-4"></div>
                <div className="w-full" style={{ borderWidth: "0px 0px 4px 4px", borderTopStyle: "initial", borderRightStyle: "initial", borderBottomStyle: "solid", borderLeftStyle: "solid", borderTopColor: "initial", borderRightColor: "initial", borderBottomColor: "rgb(42, 35, 30)", borderLeftColor: "rgb(42, 35, 30)", borderImage: "initial", padding: "2px", opacity: "1" }}>
                  <div className="text-red font-console">CAN STAKE</div>
                  {unstakedFox.length == 0 && unstakedChicken.length == 0 ? <>
                    <div className="text-red font-console text-xs">NO TOKENS</div>
                  </> : <div className="overflow-x-scroll">
                    {unstakedFox.map((item) => renderUnstaked(item, "fox"))}
                    {unstakedChicken.map((item) => renderUnstaked(item, "chicken"))}
                  </div>
                  }
                </div>
                <div className="h-4"></div>
                <div className="text-center font-console pt-1 text-red text-2xl">STAKED</div>
                <div className="h-4"></div>
                <div className="w-full" style={{ borderWidth: "0px 0px 4px 4px", borderTopStyle: "initial", borderRightStyle: "initial", borderBottomStyle: "solid", borderLeftStyle: "solid", borderTopColor: "initial", borderRightColor: "initial", borderBottomColor: "rgb(42, 35, 30)", borderLeftColor: "rgb(42, 35, 30)", borderImage: "initial", padding: "2px", opacity: "1" }}>
                  <div className="text-red font-console">BARN</div>
                  {stakedChicken.length == 0 ? <>
                    <div className="text-red font-console text-xs">NO TOKENS</div>
                  </> : <div className="overflow-x-scroll">
                    {stakedChicken.map(item => renderStaked(item, "chicken"))}
                  </div>
                  }
                </div>
                <div className="h-2"></div>
                <div className="w-full" style={{ borderWidth: "0px 0px 4px 4px", borderTopStyle: "initial", borderRightStyle: "initial", borderBottomStyle: "solid", borderLeftStyle: "solid", borderTopColor: "initial", borderRightColor: "initial", borderBottomColor: "rgb(42, 35, 30)", borderLeftColor: "rgb(42, 35, 30)", borderImage: "initial", padding: "2px", opacity: "1" }}>
                  <div className="text-red font-console">FOX PACK</div>
                  {stakedFox.length == 0 ? <>
                    <div className="text-red font-console text-xs">NO TOKENS</div>
                  </> : <div className="overflow-x-scroll">
                    {stakedFox.map(item => renderStaked(item, "fox"))}
                  </div>
                  }
                </div>
                <div className="h-4"></div>
                <div className="h-4"></div>
                {unstakedSelected.length == 0 && stakedSelected.length == 0 && <div className="text-center font-console pt-2 pb-2 text-red text-xl">Select tokens to stake, shear, unstake or burn<br></br>(burn will charge 5% MOVE)</div>}
                {unstakedSelected.length > 0 && <div className="flex flex-row space-x-4">
                  <div className="relative flex items-center justify-center cursor-pointer false hover:bg-gray-200 active:bg-gray-400"
                    style={{ userSelect: "none", width: "200px", borderImage: "url('./wood-frame.svg') 5 / 1 / 0 stretch", borderWidth: "10px" }} aria-disabled
                    onClick={stake_nft}>
                    <div className="text-center font-console pt-1">
                      {isStaking ?
                        <div className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                        : <span>Stake</span>}
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center cursor-pointer false hover:bg-gray-200 active:bg-gray-400"
                    style={{ userSelect: "none", width: "200px", borderImage: "url('./wood-frame.svg') 5 / 1 / 0 stretch", borderWidth: "10px" }}
                    onClick={burn_nft}>
                    <div className="text-center font-console pt-1">
                      {isBurning ?
                        <div className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                        : <span>Burn</span>}
                    </div>
                  </div>
                </div>}
                {stakedSelected.length > 0 && <div className="flex flex-row space-x-4">
                  <div className="relative flex items-center justify-center cursor-pointer false hover:bg-gray-200 active:bg-gray-400"
                    style={{ userSelect: "none", width: "200px", borderImage: "url('./wood-frame.svg') 5 / 1 / 0 stretch", borderWidth: "10px" }}
                    onClick={claim_egg}>
                    <div className="text-center font-console pt-1" >
                      {isClaiming ?
                        <div className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                        : <span>Collect $EGG</span>}
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center cursor-pointer false hover:bg-gray-200 active:bg-gray-400"
                    style={{ userSelect: "none", width: "200px", borderImage: "url('./wood-frame.svg') 5 / 1 / 0 stretch", borderWidth: "10px" }}
                    onClick={unstake_nft}
                  >
                    <div className="text-center font-console pt-1" >
                      {isUnstaking ?
                        <div className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading"></div>
                        : <span>Collect $EGG and Unstake</span>}
                    </div>
                  </div>
                </div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

