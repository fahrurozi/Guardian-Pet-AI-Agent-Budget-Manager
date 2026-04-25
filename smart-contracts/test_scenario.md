# GuardianBudgetManager Test Scenario

Dokumen ini menjelaskan prerequisite dan flow procedure untuk mengetes smart contract `GuardianBudgetManager`, baik lewat automated test Foundry maupun manual di Monad testnet.

## Scope

Contract under test:

- `src/GuardianBudgetManager.sol`

Core behavior:

- Owner bisa register agent.
- Agent terdaftar bisa melakukan payment dari balance contract.
- Daily limit dihitung per agent.
- Spend otomatis reset setelah 24 jam.
- Owner bisa revoke, restore, set limit, dan reset spend agent.
- Contract bisa menerima MON lewat `deposit()` atau direct transfer.

## Prerequisite

Local tools:

- WSL/Linux shell.
- Foundry installed: `forge`, `cast`, `anvil`.
- Dependencies sudah tersedia di `smart-contracts/lib`.
- Command dijalankan dari folder:

```bash
cd ~/Project/monad-blitz/Guardian-Pet-AI-Agent-Budget-Manager/smart-contracts
```

Check tools:

```bash
forge --version
cast --version
```

Jika `forge` tidak ada di PATH, gunakan:

```bash
~/.foundry/bin/forge --version
~/.foundry/bin/cast --version
```

Monad testnet manual test:

- Wallet deployer/owner punya MON testnet.
- Wallet agent punya private key/address sendiri.
- Wallet recipient/address tujuan tersedia.
- RPC sudah ada di `foundry.toml`:

```toml
[rpc_endpoints]
monad_testnet = "https://testnet-rpc.monad.xyz"
```

Environment variables untuk testnet:

```bash
export PRIVATE_KEY=0xOWNER_PRIVATE_KEY
export AGENT_PRIVATE_KEY=0xAGENT_PRIVATE_KEY
export CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT
export AGENT_ADDRESS=0xAGENT_ADDRESS
export RECIPIENT_ADDRESS=0xRECIPIENT_ADDRESS
```

Security note:

- Jangan commit private key ke repo.
- Jangan taruh private key di file `.env` jika file itu tidak masuk `.gitignore`.
- Gunakan wallet testnet saja untuk testing.

## Automated Local Test Flow

### 1. Build contract

Command:

```bash
forge build
```

Expected result:

- Compilation successful.
- Tidak ada compiler error.

### 2. Run all tests

Command:

```bash
forge test
```

Expected result:

- Semua test pass.
- Current expected total: `17 tests passed`.

### 3. Run GuardianBudgetManager tests only

Command:

```bash
forge test --match-contract GuardianBudgetManagerTest -vvv
```

Expected result:

- Semua scenario di `test/GuardianBudgetManager.t.sol` pass.
- Output memperlihatkan nama test dan status `[PASS]`.

### 4. Run specific test case

Contoh:

```bash
forge test --match-test test_ExecutePayment_WithinLimit -vvv
```

Expected result:

- Agent yang sudah registered berhasil mengirim payment di bawah daily limit.
- Balance recipient bertambah sesuai amount.

## Automated Test Case Matrix

| Test case | Procedure | Expected result |
| --- | --- | --- |
| `test_Deposit` | Call `deposit()` dengan `1 ether` | Balance contract bertambah `1 ether` |
| `test_RegisterAgent` | Owner register `agent1` | Data agent tersimpan, registered true, revoked false |
| `test_RegisterAgent_OnlyOwner` | Non-owner call `registerAgent` | Transaction revert |
| `test_ExecutePayment_WithinLimit` | Agent bayar `0.5 ether` dengan limit `1 ether` | Payment sukses, recipient balance naik |
| `test_ExecutePayment_ExceedsLimit` | Agent bayar `2 ether` dengan limit `1 ether` | Revert `"Daily limit exceeded"` |
| `test_ExecutePayment_CumulativeLimit` | Agent bayar `0.6 ether`, lalu `0.6 ether` lagi | Payment kedua revert `"Daily limit exceeded"` |
| `test_DailyReset_After24Hours` | Agent spend, lalu `vm.warp` 25 jam | Payment berikutnya sukses karena spend reset |
| `test_RevokeAgent` | Owner revoke agent, agent coba bayar | Revert `"Agent is revoked"` |
| `test_RestoreAgent` | Owner revoke lalu restore agent | Agent bisa bayar lagi |
| `test_SetDailyLimit` | Owner naikkan daily limit ke `2 ether` | Agent bisa bayar `1.5 ether` |
| `test_UnregisteredAgent_CannotPay` | Address tidak registered call payment | Revert `"Not a registered agent"` |
| `test_MultipleAgents_IndependentLimits` | Register dua agent dengan limit berbeda | Limit dihitung independen per agent |
| `test_GetAgentList` | Register dua agent, call `getAgentList()` | List berisi kedua address sesuai urutan register |
| `test_Events_PaymentExecuted` | Agent bayar `0.1 ether` | Event `PaymentExecuted` emitted |
| `test_Events_LimitExceeded` | Agent exceed limit | Event `LimitExceeded` emitted sebelum revert |

## Manual Testnet Flow

### 1. Deploy contract

Command:

```bash
forge script script/DeployGuardianBudgetManager.s.sol:DeployGuardianBudgetManager \
  --rpc-url monad_testnet \
  --broadcast
```

Expected result:

- Output menampilkan deployed address:

```text
GuardianBudgetManager deployed at: 0x...
Owner: 0x...
```

Set address hasil deploy:

```bash
export CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT
```

### 2. Verify owner

Command:

```bash
cast call $CONTRACT_ADDRESS "owner()(address)" --rpc-url monad_testnet
```

Expected result:

- Address yang keluar sama dengan deployer/owner.

### 3. Fund contract

Deposit MON ke contract:

```bash
cast send $CONTRACT_ADDRESS \
  "deposit()" \
  --value 1ether \
  --rpc-url monad_testnet \
  --private-key $PRIVATE_KEY
```

Check balance:

```bash
cast call $CONTRACT_ADDRESS "getContractBalance()(uint256)" --rpc-url monad_testnet
```

Expected result:

- Balance contract bertambah.

### 4. Register agent

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "registerAgent(address,string,string,uint256)" \
  $AGENT_ADDRESS "Whiskers" "cat" 100000000000000000 \
  --rpc-url monad_testnet \
  --private-key $PRIVATE_KEY
```

Notes:

- `100000000000000000` = `0.1 MON` jika native token memakai 18 decimals.
- Caller harus owner.

Check data agent:

```bash
cast call $CONTRACT_ADDRESS \
  "getAgent(address)(string,string,uint256,uint256,uint256,bool,bool,uint256)" \
  $AGENT_ADDRESS \
  --rpc-url monad_testnet
```

Expected result:

- `name` = `Whiskers`
- `petEmoji` = `cat`
- `dailyLimit` = `100000000000000000`
- `spentToday` = `0`
- `isRegistered` = `true`
- `isRevoked` = `false`
- `remainingToday` = `100000000000000000`

### 5. Execute payment within limit

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "executePayment(address,uint256,string)" \
  $RECIPIENT_ADDRESS 50000000000000000 "manual test payment" \
  --rpc-url monad_testnet \
  --private-key $AGENT_PRIVATE_KEY
```

Expected result:

- Transaction success.
- Recipient menerima `0.05 MON`.
- Event `PaymentExecuted` emitted.
- `spentToday` agent bertambah.
- `remainingToday` berkurang.

Check agent state:

```bash
cast call $CONTRACT_ADDRESS \
  "getAgent(address)(string,string,uint256,uint256,uint256,bool,bool,uint256)" \
  $AGENT_ADDRESS \
  --rpc-url monad_testnet
```

### 6. Execute payment exceeding daily limit

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "executePayment(address,uint256,string)" \
  $RECIPIENT_ADDRESS 100000000000000000 "over limit test" \
  --rpc-url monad_testnet \
  --private-key $AGENT_PRIVATE_KEY
```

Expected result:

- Transaction revert dengan reason:

```text
Daily limit exceeded
```

### 7. Update daily limit

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "setDailyLimit(address,uint256)" \
  $AGENT_ADDRESS 200000000000000000 \
  --rpc-url monad_testnet \
  --private-key $PRIVATE_KEY
```

Expected result:

- Transaction success.
- Event `DailyLimitSet` emitted.
- Agent daily limit menjadi `0.2 MON`.

### 8. Revoke agent

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "revokeAgent(address)" \
  $AGENT_ADDRESS \
  --rpc-url monad_testnet \
  --private-key $PRIVATE_KEY
```

Expected result:

- Transaction success.
- Event `AgentRevoked` emitted.
- `isRevoked` menjadi `true`.

Payment setelah revoke:

```bash
cast send $CONTRACT_ADDRESS \
  "executePayment(address,uint256,string)" \
  $RECIPIENT_ADDRESS 10000000000000000 "should fail after revoke" \
  --rpc-url monad_testnet \
  --private-key $AGENT_PRIVATE_KEY
```

Expected result:

- Revert `"Agent is revoked"`.

### 9. Restore agent

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "restoreAgent(address)" \
  $AGENT_ADDRESS \
  --rpc-url monad_testnet \
  --private-key $PRIVATE_KEY
```

Expected result:

- Transaction success.
- Event `AgentRestored` emitted.
- `isRevoked` menjadi `false`.
- Agent bisa execute payment lagi selama masih ada remaining daily limit.

### 10. Reset daily spend manually

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "resetDailySpend(address)" \
  $AGENT_ADDRESS \
  --rpc-url monad_testnet \
  --private-key $PRIVATE_KEY
```

Expected result:

- Transaction success.
- Event `DailySpendReset` emitted.
- `spentToday` kembali `0`.
- `remainingToday` kembali sesuai `dailyLimit`.

## Negative Manual Scenarios

### Non-owner cannot register agent

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "registerAgent(address,string,string,uint256)" \
  $AGENT_ADDRESS "Bad Caller" "cat" 100000000000000000 \
  --rpc-url monad_testnet \
  --private-key $AGENT_PRIVATE_KEY
```

Expected result:

- Transaction revert karena caller bukan owner.

### Unregistered address cannot pay

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "executePayment(address,uint256,string)" \
  $RECIPIENT_ADDRESS 10000000000000000 "unregistered test" \
  --rpc-url monad_testnet \
  --private-key $UNREGISTERED_PRIVATE_KEY
```

Expected result:

- Revert `"Not a registered agent"`.

### Zero amount payment fails

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "executePayment(address,uint256,string)" \
  $RECIPIENT_ADDRESS 0 "zero amount test" \
  --rpc-url monad_testnet \
  --private-key $AGENT_PRIVATE_KEY
```

Expected result:

- Revert `"Amount must be > 0"`.

### Zero address recipient fails

Command:

```bash
cast send $CONTRACT_ADDRESS \
  "executePayment(address,uint256,string)" \
  0x0000000000000000000000000000000000000000 10000000000000000 "zero recipient test" \
  --rpc-url monad_testnet \
  --private-key $AGENT_PRIVATE_KEY
```

Expected result:

- Revert `"Invalid recipient"`.

### Insufficient contract balance fails

Procedure:

- Deploy fresh contract.
- Register agent with limit greater than contract balance.
- Do not fund contract, or fund less than requested amount.
- Agent calls `executePayment`.

Expected result:

- Revert `"Insufficient contract balance"`.

## Event Checklist

Use transaction logs or explorer to verify events:

| Action | Expected event |
| --- | --- |
| `deposit()` or direct MON transfer | `Deposited(address,uint256)` |
| `registerAgent()` | `AgentRegistered(address,string,string,uint256)` |
| `setDailyLimit()` | `DailyLimitSet(address,uint256)` |
| Successful `executePayment()` | `PaymentExecuted(address,address,uint256,string)` |
| Exceeded limit | `LimitExceeded(address,uint256,uint256)` |
| `revokeAgent()` | `AgentRevoked(address)` |
| `restoreAgent()` | `AgentRestored(address)` |
| Auto/manual spend reset | `DailySpendReset(address)` |

## Pass Criteria

Testing dianggap pass jika:

- `forge build` sukses.
- `forge test` sukses tanpa failed test.
- Deploy testnet sukses dan owner benar.
- Contract bisa menerima deposit.
- Owner bisa register agent.
- Agent bisa execute payment dalam limit.
- Agent tidak bisa exceed daily limit.
- Non-owner tidak bisa menjalankan fungsi owner-only.
- Revoked agent tidak bisa execute payment.
- Restored agent bisa execute payment lagi.
- Daily spend bisa reset otomatis setelah 24 jam di local test dan manual lewat `resetDailySpend` di testnet.

## Troubleshooting

`forge: command not found`:

```bash
export PATH="$HOME/.foundry/bin:$PATH"
```

atau gunakan path absolut:

```bash
~/.foundry/bin/forge test
```

RPC error:

- Pastikan `foundry.toml` punya endpoint `monad_testnet`.
- Coba pakai URL langsung:

```bash
forge test
cast chain-id --rpc-url https://testnet-rpc.monad.xyz
```

Insufficient funds:

- Fund wallet owner dan agent dengan MON testnet.
- Fund contract sebelum agent execute payment.

Wrong owner:

```bash
cast call $CONTRACT_ADDRESS "owner()(address)" --rpc-url monad_testnet
```

Jika owner bukan wallet yang dipakai, owner lama harus memanggil:

```bash
cast send $CONTRACT_ADDRESS \
  "transferOwnership(address)" 0xNEW_OWNER \
  --rpc-url monad_testnet \
  --private-key $OLD_OWNER_PRIVATE_KEY
```
