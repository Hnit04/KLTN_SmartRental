package iuh.se.kltn.backend.modules.contract.service;

import okhttp3.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthGetTransactionCount;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class BlockchainService {

    @Value("${blockchain.rpc-url}")
    private String rpcUrl;

    @Value("${blockchain.private-key}")
    private String privateKey;

    // ✅ THÊM MỚI: Lấy Chain ID từ file cấu hình (Sepolia = 11155111)
    @Value("${blockchain.chain-id}")
    private long chainId;

    // 👇👇👇 DÁN LẠI CHUỖI BYTECODE DÀI CỦA BẠN VÀO ĐÂY 👇👇👇
    private static final String CONTRACT_BINARY = "608060405234801562000010575f80fd5b5060405162001caf38038062001caf833981016040819052620000339162000480565b60015f819055805460ff191690556001600160a01b038516620000905760405162461bcd60e51b815260206004820152601060248201526f125b9d985b1a59081b185b991b1bdc9960821b60448201526064015b60405180910390fd5b6001600160a01b038416620000d95760405162461bcd60e51b815260206004820152600e60248201526d125b9d985b1a59081d195b985b9d60921b604482015260640162000087565b80516008146200011d5760405162461bcd60e51b815260206004820152600e60248201526d496e76616c696420706172616d7360901b604482015260640162000087565b806006815181106200013357620001336200059f565b6020026020010151816005815181106200015157620001516200059f565b602002602001015110620001975760405162461bcd60e51b815260206004820152600c60248201526b496e76616c69642074696d6560a01b604482015260640162000087565b601481600781518110620001af57620001af6200059f565b60200260200101511115620001fa5760405162461bcd60e51b815260206004820152601060248201526f0a0cadcc2d8e8f240e8dede40d0d2ced60831b604482015260640162000087565b600180546001600160a01b0380881661010002610100600160a81b031990921691909117909155600280549186166001600160a01b0319928316179055600380549091163317905560046200025084826200063f565b5060056200025f83826200063f565b50805f815181106200027557620002756200059f565b6020026020010151600681905550806001815181106200029957620002996200059f565b602002602001015160078190555080600281518110620002bd57620002bd6200059f565b602002602001015160088190555080600381518110620002e157620002e16200059f565b6020026020010151600981905550806004815181106200030557620003056200059f565b6020026020010151600a81905550806005815181106200032957620003296200059f565b6020026020010151600b81905550806006815181106200034d576200034d6200059f565b6020026020010151600c81905550806007815181106200037157620003716200059f565b6020908102919091010151600d555050600f805460ff191690555062000707915050565b80516001600160a01b0381168114620003ac575f80fd5b919050565b634e487b7160e01b5f52604160045260245ffd5b604051601f8201601f191681016001600160401b0381118282101715620003f057620003f0620003b1565b604052919050565b5f82601f83011262000408575f80fd5b81516001600160401b03811115620004245762000424620003b1565b60206200043a601f8301601f19168201620003c5565b82815285828487010111156200044e575f80fd5b5f5b838110156200046d57858101830151828201840152820162000450565b505f928101909101919091529392505050565b5f805f805f60a0868803121562000495575f80fd5b620004a08662000395565b94506020620004b181880162000395565b60408801519095506001600160401b0380821115620004ce575f80fd5b620004dc8a838b01620003f8565b95506060890151915080821115620004f2575f80fd5b620005008a838b01620003f8565b9450608089015191508082111562000516575f80fd5b818901915089601f8301126200052a575f80fd5b8151818111156200053f576200053f620003b1565b8060051b915062000552848301620003c5565b818152918301840191848101908c8411156200056c575f80fd5b938501935b838510156200058c5784518252938501939085019062000571565b8096505050505050509295509295909350565b634e487b7160e01b5f52603260045260245ffd5b600181811c90821680620005c857607f821691505b602082108103620005e757634e487b7160e01b5f52602260045260245ffd5b50919050565b601f8211156200063a575f81815260208120601f850160051c81016020861015620006155750805b601f850160051c820191505b81811015620006365782815560010162000621565b5050505b505050565b81516001600160401b038111156200065b576200065b620003b1565b62000673816200066c8454620005b3565b84620005ed565b602080601f831160018114620006a9575f8415620006915750858301515b5f19600386901b1c1916600185901b17855562000636565b5f85815260208120601f198616915b82811015620006d957888601518255948401946001909101908401620006b8565b5085821015620006f757878501515f19600388901b60f8161c191681555b5050505050600190811b01905550565b61159a80620007155f395ff3fe6080604052600436106101af575f3560e01c80637c8261c2116100e7578063c85a6b3d11610087578063dc1997ea11610062578063dc1997ea14610516578063e99f8f7d1461053a578063f09751901461054f578063f8ef1e1314610562575f80fd5b8063c85a6b3d146104da578063d0e30db0146104f9578063d879bd1414610501575f80fd5b806390ff79cf116100c257806390ff79cf14610461578063adf0779114610480578063c19d93fb1461049f578063c24a0f8b146104c5575f80fd5b80637c8261c2146104005780638e058a4414610414578063904c60941461044d575f80fd5b806328bdcde8116101525780635c975abb1161012d5780635c975abb1461034e57806364d77cea14610371578063662f3c48146103925780636c0db0dd146103ed575f80fd5b806328bdcde814610287578063419759f51461032457806341dc341214610339575f80fd5b80630b97bc861161018d5780630b97bc86146102275780630d4211a71461023c5780631622d482146102515780631d01364c14610272575f80fd5b806302655972146101b357806306f71ad2146101db578063099e4133146101f0575b5f80fd5b3480156101be575f80fd5b506101c860085481565b6040519081526020015b60405180910390f35b3480156101e6575f80fd5b506101c860135481565b3480156101fb575f80fd5b5060035461020f906001600160a01b031681565b6040516001600160a01b0390911681526020016101d2565b348015610232575f80fd5b506101c8600b5481565b348015610247575f80fd5b506101c8600d5481565b34801561025c575f80fd5b5061027061026b36600461133f565b610577565b005b34801561027d575f80fd5b506101c8600e5481565b348015610292575f80fd5b506102e76102a1366004611376565b60106020525f9081526040902080546001820154600283015460038401546004850154600586015460068701546007909701549596949593949293919260ff9091169188565b6040805198895260208901979097529587019490945260608601929092526080850152151560a084015260c083015260e0820152610100016101d2565b34801561032f575f80fd5b506101c860075481565b348015610344575f80fd5b506101c860115481565b348015610359575f80fd5b5060015460ff165b60405190151581526020016101d2565b34801561037c575f80fd5b50610385610869565b6040516101d2919061138d565b34801561039d575f80fd5b506103d06103ac366004611376565b60146020525f90815260409020805460019091015460ff8082169161010090041683565b6040805193845291151560208401521515908201526060016101d2565b6102706103fb366004611376565b6108f5565b34801561040b575f80fd5b506101c8601481565b34801561041f575f80fd5b5061036161042e3660046113d8565b601260209081525f928352604080842090915290825290205460ff1681565b348015610458575f80fd5b50610385610a94565b34801561046c575f80fd5b5061027061047b3660046113d8565b610aa1565b34801561048b575f80fd5b5060025461020f906001600160a01b031681565b3480156104aa575f80fd5b50600f546104b89060ff1681565b6040516101d2919061140c565b3480156104d0575f80fd5b506101c8600c5481565b3480156104e5575f80fd5b506102706104f4366004611376565b610c36565b610270610e42565b34801561050c575f80fd5b506101c8600a5481565b348015610521575f80fd5b5060015461020f9061010090046001600160a01b031681565b348015610545575f80fd5b506101c860095481565b61027061055d366004611376565b610fa3565b34801561056d575f80fd5b506101c860065481565b60015461010090046001600160a01b031633146105cb5760405162461bcd60e51b815260206004820152600d60248201526c13db9b1e481b185b991b1bdc99609a1b60448201526064015b60405180910390fd5b600180600f5460ff1660028111156105e5576105e56113f8565b146106025760405162461bcd60e51b81526004016105c290611432565b61060a611178565b600c5442111561064f5760405162461bcd60e51b815260206004820152601060248201526f10dbdb9d1c9858dd08195e1c1a5c995960821b60448201526064016105c2565b600186101580156106615750600c8611155b61069d5760405162461bcd60e51b815260206004820152600d60248201526c092dcecc2d8d2c840dadedce8d609b1b60448201526064016105c2565b5f82116106dc5760405162461bcd60e51b815260206004820152600d60248201526c496e76616c696420677261636560981b60448201526064016105c2565b5f86815260126020908152604080832088845290915290205460ff161561072e5760405162461bcd60e51b815260206004820152600660248201526545786973747360d01b60448201526064016105c2565b5f610739858561119e565b600654610746919061146d565b90505f610753844261146d565b601180546001019055601380549192505f61076d83611480565b909155505060408051610100810182526011805480835260208084018d81528486018d815260608601898152608087018981525f60a0890181815260c08a0182815260e08b01838152988352601088528b83209a518b5595516001808c0191909155945160028b0155925160038a015590516004890155905160058801805491151560ff199283161790559251600688015593516007909601959095558d8352601282528583208d845282529185902080549092169093179055548251858152918201849052917f99fb4ec2981c7e769c2ab6070477fc09bce994c993fc6dd354404c99129e4476910160405180910390a25050505050505050565b6004805461087690611498565b80601f01602080910402602001604051908101604052809291908181526020018280546108a290611498565b80156108ed5780601f106108c4576101008083540402835291602001916108ed565b820191905f5260205f20905b8154815290600101906020018083116108d057829003601f168201915b505050505081565b6002546001600160a01b0316331461091f5760405162461bcd60e51b81526004016105c2906114d0565b6109276111da565b600180600f5460ff166002811115610941576109416113f8565b1461095e5760405162461bcd60e51b81526004016105c290611432565b610966611178565b5f8281526014602052604090206001810154610100900460ff166109b65760405162461bcd60e51b8152602060048201526007602482015266125b9d985b1a5960ca1b60448201526064016105c2565b600181015460ff16156109f45760405162461bcd60e51b81526004016105c29060208082526004908201526314185a5960e21b604082015260600190565b80543414610a145760405162461bcd60e51b81526004016105c2906114f5565b6001818101805460ff191682179055601380545f1901905554610a459061010090046001600160a01b031634611202565b604080513481525f60208201523381830152905184917fe89757c5d51dfa2098c101be1f0ffafe1efc5c9c46402d1911ae8fff2f04485c919081900360600190a25050610a9160015f55565b50565b6005805461087690611498565b60015461010090046001600160a01b0316331480610ac957506003546001600160a01b031633145b610b065760405162461bcd60e51b815260206004820152600e60248201526d139bdd08185d5d1a1bdc9a5e995960921b60448201526064016105c2565b610b0e611178565b5f8111610b4e5760405162461bcd60e51b815260206004820152600e60248201526d125b9d985b1a5908185b5bdd5b9d60921b60448201526064016105c2565b5f82815260146020526040902060010154610100900460ff1615610b9d5760405162461bcd60e51b815260206004820152600660248201526545786973747360d01b60448201526064016105c2565b604080516060810182528281525f6020808301828152600184860181815288855260148452938690209451855590519381018054935161ffff1990941694151561ff001916949094176101009315159390930292909217909255601380549091019055905182815283917f3793cd6210fb3c738a41aceb2bfcbee49a4c168857a7ecb2dece3edd1fc29a15910160405180910390a25050565b60015461010090046001600160a01b0316331480610c5e57506003546001600160a01b031633145b610c9b5760405162461bcd60e51b815260206004820152600e60248201526d139bdd08185d5d1a1bdc9a5e995960921b60448201526064016105c2565b600180600f5460ff166002811115610cb557610cb56113f8565b14610cd25760405162461bcd60e51b81526004016105c290611432565b610cda611178565b610ce26111da565b600c54421015610d205760405162461bcd60e51b8152602060048201526009602482015268546f6f206561726c7960b81b60448201526064016105c2565b60135415610d5f5760405162461bcd60e51b815260206004820152600c60248201526b556e706169642062696c6c7360a01b60448201526064016105c2565b600e54821115610d9c5760405162461bcd60e51b81526020600482015260086024820152670a8dede40daeac6d60c31b60448201526064016105c2565b5f82600e54610dab919061151b565b600f805460ff191660021790555f600e5590508015610dda57600254610dda906001600160a01b031682611202565b8215610dfb57600154610dfb9061010090046001600160a01b031684611202565b60408051828152602081018590527fc0590c5a8ce79dffbdde17480a06203778f954965615e1d9577dbc90da2ff109910160405180910390a150610e3e60015f55565b5050565b6002546001600160a01b03163314610e6c5760405162461bcd60e51b81526004016105c2906114d0565b5f80600f5460ff166002811115610e8557610e856113f8565b14610ea25760405162461bcd60e51b81526004016105c290611432565b610eaa611178565b610eb26111da565b600e5415610ef65760405162461bcd60e51b8152602060048201526011602482015270105b1c9958591e4819195c1bdcda5d1959607a1b60448201526064016105c2565b6007543414610f175760405162461bcd60e51b81526004016105c2906114f5565b600c544210610f525760405162461bcd60e51b8152602060048201526007602482015266115e1c1a5c995960ca1b60448201526064016105c2565b34600e819055600f805460ff1916600117905560405190815233907f801e55ebf9b7ad844bb66232b3193f546d19545f36313c217d1ff9bf70fa63969060200160405180910390a2610a9160015f55565b6002546001600160a01b03163314610fcd5760405162461bcd60e51b81526004016105c2906114d0565b610fd56111da565b600180600f5460ff166002811115610fef57610fef6113f8565b1461100c5760405162461bcd60e51b81526004016105c290611432565b611014611178565b5f8211801561102557506011548211155b61105e5760405162461bcd60e51b815260206004820152600a602482015269125b9d985b1a59081a5960b21b60448201526064016105c2565b5f828152601060205260409020600581015460ff16156110a95760405162461bcd60e51b81526004016105c29060208082526004908201526314185a5960e21b604082015260600190565b5f6110b38261129a565b90505f8183600301546110c6919061146d565b90508034146110e75760405162461bcd60e51b81526004016105c2906114f5565b60058301805460ff1916600190811790915542600685015560078401839055601380545f1901905554611129906001600160a01b036101009091041634611202565b60408051348152602081018490523381830152905186917fe89757c5d51dfa2098c101be1f0ffafe1efc5c9c46402d1911ae8fff2f04485c919081900360600190a250505050610a9160015f55565b60015460ff161561119c5760405163d93c066560e01b815260040160405180910390fd5b565b5f600a54600954836111b0919061152e565b6008546111bd908661152e565b6111c7919061146d565b6111d1919061146d565b90505b92915050565b60025f54036111fc57604051633ee5aeb560e01b815260040160405180910390fd5b60025f55565b804710156112255760405163cd78605960e01b81523060048201526024016105c2565b5f826001600160a01b0316826040515f6040518083038185875af1925050503d805f811461126e576040519150601f19603f3d011682016040523d82523d5f602084013e611273565b606091505b505090508061129557604051630a12f52160e11b815260040160405180910390fd5b505050565b5f816004015442116112ad57505f919050565b5f6201518060018460040154426112c4919061151b565b6112d1906201518061146d565b6112db919061151b565b6112e59190611545565b90505f606482600d5486600301546112fd919061152e565b611307919061152e565b6113119190611545565b90505f84600301546002611325919061152e565b90508082116113345781611336565b805b95945050505050565b5f805f805f60a08688031215611353575f80fd5b505083359560208501359550604085013594606081013594506080013592509050565b5f60208284031215611386575f80fd5b5035919050565b5f6020808352835180828501525f5b818110156113b85785810183015185820160400152820161139c565b505f604082860101526040601f19601f8301168501019250505092915050565b5f80604083850312156113e9575f80fd5b50508035926020909101359150565b634e487b7160e01b5f52602160045260245ffd5b602081016003831061142c57634e487b7160e01b5f52602160045260245ffd5b91905290565b6020808252600d908201526c496e76616c696420737461746560981b604082015260600190565b634e487b7160e01b5f52601160045260245ffd5b808201808211156111d4576111d4611459565b5f6001820161149157611491611459565b5060010190565b600181811c908216806114ac57607f821691505b6020821081036114ca57634e487b7160e01b5f52602260045260245ffd5b50919050565b6020808252600b908201526a13db9b1e481d195b985b9d60aa1b604082015260600190565b6020808252600c908201526b15dc9bdb99c8185b5bdd5b9d60a21b604082015260600190565b818103818111156111d4576111d4611459565b80820281158282048414176111d4576111d4611459565b5f8261155f57634e487b7160e01b5f52601260045260245ffd5b50049056fea264697066735822122087f9e496ca6b5a6e5b591786a4bea6d36eff29156f78803e52526f69f985c8ae64736f6c63430008140033";

    public String deployRentalContract(
            String landlordAddress,
            String tenantAddress,
            String roomName,
            String contractHash,
            BigInteger rentAmount,
            BigInteger depositAmount,
            BigInteger elecPrice,
            BigInteger waterPrice,
            BigInteger internetPrice,
            BigInteger startDate,
            BigInteger endDate,
            BigInteger latePenaltyPercent) throws Exception {

        // Cấu hình Timeout 120 giây
        OkHttpClient httpClient = new OkHttpClient.Builder()
                .connectTimeout(120, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(120, TimeUnit.SECONDS)
                .build();

        Web3j web3j = Web3j.build(new HttpService(rpcUrl, httpClient, false));
        Credentials credentials = Credentials.create(privateKey);

        org.web3j.abi.datatypes.DynamicArray<Uint256> uintParams = new org.web3j.abi.datatypes.DynamicArray<>(
                Uint256.class,
                new Uint256(rentAmount),
                new Uint256(depositAmount),
                new Uint256(elecPrice),
                new Uint256(waterPrice),
                new Uint256(internetPrice),
                new Uint256(startDate),
                new Uint256(endDate),
                new Uint256(latePenaltyPercent)
        );

        String encodedConstructor = FunctionEncoder.encodeConstructor(Arrays.asList(
                new Address(landlordAddress),
                new Address(tenantAddress),
                new Utf8String(roomName),
                new Utf8String(contractHash),
                uintParams));

        String data = CONTRACT_BINARY + encodedConstructor;

        EthGetTransactionCount ethGetTransactionCount = web3j.ethGetTransactionCount(
                credentials.getAddress(), DefaultBlockParameterName.LATEST).send();
        BigInteger nonce = ethGetTransactionCount.getTransactionCount();

        BigInteger gasLimit = BigInteger.valueOf(3000000);
        BigInteger currentGasPrice = web3j.ethGasPrice().send().getGasPrice();
        BigInteger gasPrice = currentGasPrice.add(currentGasPrice.divide(BigInteger.valueOf(10)));

        RawTransaction rawTransaction = RawTransaction.createContractTransaction(
                nonce, gasPrice, gasLimit, BigInteger.ZERO, data);

        byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, chainId, credentials);

        String hexValue = Numeric.toHexString(signedMessage);

        EthSendTransaction transactionResponse = web3j.ethSendRawTransaction(hexValue).send();

        if (transactionResponse.hasError()) {
            throw new RuntimeException("Lỗi Blockchain: " + transactionResponse.getError().getMessage());
        }

        String transactionHash = transactionResponse.getTransactionHash();
        System.out.println("🚀 Đang Deploy... Tx Hash: " + transactionHash);

        for (int i = 0; i < 40; i++) {
            Thread.sleep(5000);
            TransactionReceipt receipt = web3j.ethGetTransactionReceipt(transactionHash).send().getTransactionReceipt()
                    .orElse(null);
            if (receipt != null) {
                if (receipt.getContractAddress() != null) {
                    System.out.println("✅ Deploy thành công! Address: " + receipt.getContractAddress());
                    return receipt.getContractAddress();
                }
            }
        }

        throw new RuntimeException("Hết thời gian chờ (Timeout) khi đợi Blockchain xác nhận.");
    }

    // ========================================================================================
    // 🔍 ĐỌC DỮ LIỆU TỪ SMART CONTRACT TRÊN BLOCKCHAIN (Level 3 Verification)
    // ========================================================================================

    /**
     * Đọc dữ liệu từ Smart Contract trên Sepolia để so sánh với Database.
     * Trả về Map chứa: rentAmount, depositAmount, roomName từ on-chain.
     */
    public Map<String, Object> readContractData(String contractAddress) throws Exception {
        Web3j web3j = Web3j.build(new HttpService(rpcUrl));
        Map<String, Object> result = new LinkedHashMap<>();

        // 1. Đọc rentAmount() → uint256 (selector: 0xf8ef1e13)
        BigInteger onChainRent = readUint256(web3j, contractAddress, "rentAmount");
        result.put("rentAmount", onChainRent);

        // 2. Đọc depositAmount() → uint256 (selector: 0x419759f5)
        BigInteger onChainDeposit = readUint256(web3j, contractAddress, "depositAmount");
        result.put("depositAmount", onChainDeposit);

        // 3. Đọc roomName() → string (selector: 0x64d77cea)
        String onChainRoom = readString(web3j, contractAddress, "roomName");
        result.put("roomName", onChainRoom);

        // 4. Đọc contractHash() → string (selector: 0x904c6094)
        String onChainHash = readString(web3j, contractAddress, "contractHash");
        result.put("contractHash", onChainHash);

        // 5. Đọc elecPrice() -> uint256
        BigInteger onChainElec = readUint256(web3j, contractAddress, "elecPrice");
        result.put("elecPrice", onChainElec);

        // 6. Đọc waterPrice() -> uint256
        BigInteger onChainWater = readUint256(web3j, contractAddress, "waterPrice");
        result.put("waterPrice", onChainWater);

        // 7. Đọc internetPrice() -> uint256
        BigInteger onChainInternet = readUint256(web3j, contractAddress, "internetPrice");
        result.put("internetPrice", onChainInternet);

        // 8. Đọc startDate() -> uint256
        BigInteger onChainStartDate = readUint256(web3j, contractAddress, "startDate");
        result.put("startDate", onChainStartDate);

        // 9. Đọc endDate() -> uint256
        BigInteger onChainEndDate = readUint256(web3j, contractAddress, "endDate");
        result.put("endDate", onChainEndDate);

        // 10. Đọc latePenaltyPercent() -> uint256
        BigInteger onChainLatePenalty = readUint256(web3j, contractAddress, "latePenaltyPercent");
        result.put("latePenaltyPercent", onChainLatePenalty);

        // 11. Đọc landlord() -> address
        String onChainLandlord = readAddress(web3j, contractAddress, "landlord");
        if (onChainLandlord != null) result.put("landlordAddress", onChainLandlord.toLowerCase());

        // 12. Đọc tenant() -> address
        String onChainTenant = readAddress(web3j, contractAddress, "tenant");
        if (onChainTenant != null) result.put("tenantAddress", onChainTenant.toLowerCase());

        // 13. Đọc unpaidBillCount() -> uint256
        BigInteger onChainUnpaid = readUint256(web3j, contractAddress, "unpaidBillCount");
        result.put("unpaidBillCount", onChainUnpaid);

        web3j.shutdown();
        return result;
    }

    // --- Helper: đọc uint256 ---
    private BigInteger readUint256(Web3j web3j, String contractAddress, String functionName) throws Exception {
        Function function = new Function(functionName,
                Collections.emptyList(),
                Arrays.asList(new TypeReference<Uint256>() {}));

        String encodedFunction = FunctionEncoder.encode(function);
        EthCall response = web3j.ethCall(
                Transaction.createEthCallTransaction(null, contractAddress, encodedFunction),
                DefaultBlockParameterName.LATEST
        ).send();

        List<Type> decoded = FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());
        if (decoded.isEmpty()) return BigInteger.ZERO;
        return ((Uint256) decoded.get(0)).getValue();
    }

    // --- Helper: đọc string ---
    private String readString(Web3j web3j, String contractAddress, String functionName) throws Exception {
        Function function = new Function(functionName,
                Collections.emptyList(),
                Arrays.asList(new TypeReference<Utf8String>() {}));

        String encodedFunction = FunctionEncoder.encode(function);
        EthCall response = web3j.ethCall(
                Transaction.createEthCallTransaction(null, contractAddress, encodedFunction),
                DefaultBlockParameterName.LATEST
        ).send();

        List<Type> decoded = FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());
        if (decoded.isEmpty()) return "";
        return decoded.get(0).getValue().toString();
    }

    // --- Helper: đọc address ---
    private String readAddress(Web3j web3j, String contractAddress, String functionName) throws Exception {
        Function function = new Function(functionName,
                Collections.emptyList(),
                Arrays.asList(new TypeReference<Address>() {}));

        String encodedFunction = FunctionEncoder.encode(function);
        EthCall response = web3j.ethCall(
                Transaction.createEthCallTransaction(null, contractAddress, encodedFunction),
                DefaultBlockParameterName.LATEST
        ).send();

        List<Type> decoded = FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());
        if (decoded.isEmpty()) return "";
        return decoded.get(0).getValue().toString();
    }

    // ========================================================================================
    // 🔗 GỬI GIAO DỊCH WRITE ĐẾN SMART CONTRACT ĐÃ DEPLOY
    // ========================================================================================

    private String sendContractTransaction(String contractAddress, String functionName,
                                            List<Type> inputParams) throws Exception {
        OkHttpClient httpClient = new OkHttpClient.Builder()
                .connectTimeout(120, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(120, TimeUnit.SECONDS)
                .build();

        Web3j web3j = Web3j.build(new HttpService(rpcUrl, httpClient, false));
        Credentials credentials = Credentials.create(privateKey);

        Function function = new Function(functionName, inputParams, Collections.emptyList());
        String encodedFunction = FunctionEncoder.encode(function);

        EthGetTransactionCount ethGetTransactionCount = web3j.ethGetTransactionCount(
                credentials.getAddress(), DefaultBlockParameterName.LATEST).send();
        BigInteger nonce = ethGetTransactionCount.getTransactionCount();

        BigInteger gasLimit = BigInteger.valueOf(500000);
        BigInteger currentGasPrice = web3j.ethGasPrice().send().getGasPrice();
        BigInteger gasPrice = currentGasPrice.add(currentGasPrice.divide(BigInteger.valueOf(10)));

        RawTransaction rawTransaction = RawTransaction.createTransaction(
                nonce, gasPrice, gasLimit, contractAddress, BigInteger.ZERO, encodedFunction);

        byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, chainId, credentials);
        String hexValue = Numeric.toHexString(signedMessage);

        EthSendTransaction transactionResponse = web3j.ethSendRawTransaction(hexValue).send();

        if (transactionResponse.hasError()) {
            web3j.shutdown();
            throw new RuntimeException("Lỗi Blockchain: " + transactionResponse.getError().getMessage());
        }

        String txHash = transactionResponse.getTransactionHash();
        System.out.println("🔗 Đang gửi tx " + functionName + "... Hash: " + txHash);

        for (int i = 0; i < 30; i++) {
            Thread.sleep(3000);
            TransactionReceipt receipt = web3j.ethGetTransactionReceipt(txHash).send()
                    .getTransactionReceipt().orElse(null);
            if (receipt != null) {
                web3j.shutdown();
                if (receipt.isStatusOK()) {
                    System.out.println("✅ " + functionName + " thành công! Tx: " + txHash);
                    return txHash;
                } else {
                    throw new RuntimeException("Giao dịch " + functionName + " thất bại on-chain: " + txHash);
                }
            }
        }

        web3j.shutdown();
        throw new RuntimeException("Hết thời gian chờ blockchain xác nhận " + functionName);
    }

    /**
     * Đăng ký hóa đơn từ Backend lên Blockchain (registerExternalBill).
     */
    public String registerExternalBill(String contractAddress, long billId, long amount) throws Exception {
        return sendContractTransaction(contractAddress, "registerExternalBill", Arrays.asList(
                new Uint256(BigInteger.valueOf(billId)),
                new Uint256(BigInteger.valueOf(amount))
        ));
    }

    /**
     * Kết thúc hợp đồng trên Blockchain (endContract).
     */
    public String endContractOnChain(String contractAddress, long deduction) throws Exception {
        return sendContractTransaction(contractAddress, "endContract", Arrays.asList(
                new Uint256(BigInteger.valueOf(deduction))
        ));
    }

    /**
     * Xác minh giao dịch có thật trên Blockchain hay không.
     */
    public boolean verifyTransaction(String txHash) {
        try {
            Web3j web3j = Web3j.build(new HttpService(rpcUrl));
            TransactionReceipt receipt = web3j.ethGetTransactionReceipt(txHash).send()
                    .getTransactionReceipt().orElse(null);
            web3j.shutdown();
            return receipt != null && receipt.isStatusOK();
        } catch (Exception e) {
            System.err.println("Lỗi verify transaction: " + e.getMessage());
            return false;
        }
    }
}
