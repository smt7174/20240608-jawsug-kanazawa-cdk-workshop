## Tips.md
このファイルでは、AWS CDKおよびその他について、「参考」および「Tips」という形で参考情報（知っているとちょっと役に立つ情報）を記載しています。（README.mdが煩雑になってしまうため、ファイルを分けました）  
  
「参考」にはAWS CDKを扱う際に知っておいた方がよい情報を記載していますので、デプロイの待ち時間などに読んでみてください。  
「Tips」については、このワークショップにおいて必須...という訳でもないので「ワークショップをどんどん進めていきたい」という方は読み飛ばしてしまって構いません。（時間があったらちょっと読む...くらいでOK）  
  

## 目次  
TODO: 後で書く
  
### 参考：Hotswap デプロイについて  
AWS CDKのデプロイ(```cdk deploy```)では、オプションで ```hotswap``` または ```hotswap-fallback``` を指定することができます。  
  
```sh
npx cdk deploy --hotswap
npx cdk deploy --hotswap-fallback
```

これらを指定すると、デプロイ時にCloudFormationを使用せず（=CloudFormationの変更セットを作成せず）、AWS CDKがAWSリソースを直接更新するため、通常よりも高速にデプロイを実施することができます。  
  
ただし本ワークショップでは下記の理由により、Hotswap デプロイは使用していません。  
  
- デプロイにそこまで時間がかからない
- Hotswap デプロイに対応していないリソースも多い
  - 例えば、API GatewayはHotswap デプロイ未対応です。
- 万が一何かあった際に手間がかかる＆面倒である
- あくまでもAWS CDKに初めて触れる方を対象としたワークショップである  
  
が、上記を理解した上で「それでも早くデプロイしたい」という方は、Hotswap デプロイを使用して頂いて構いません。  
  
ちなみに```hotswap``` と ```hotswap-fallback``` の違いは、Hotswap デプロイに未対応のリソースがあった場合の挙動です。（```hotswap``` はそのリソースは無視する、```hotswap-fallback``` は通常のデプロイに切り替えてデプロイを続行する）
  
なおこのHotswap デプロイは、あくまでも開発時にデプロイを高速に実施するための機能です。**本番環境では絶対に使用しないでください！** （CloudFormationのドリフト（=CloudFormationテンプレートと実際のリソースの状態の差分）が発生しまくるので）  
  
### 参考：使用するプログラム言語について  
今回のワークショップでは、プログラム言語はTypeScriptを使用します。  
AWS CDKを使用する場合、プログラム言語はTypeScriptを使用する事が多いです。(AWS CDK自体がTypeScriptで実装されているため)  
  
ちなみに、AWS CDKは下記のプログラム言語をサポートしています。
  
- TypeScript
- JavaScript
- Python
- Java
- C#
- Go
  
なおどのプログラム言語を使用する場合でも（TypeScriptやJavaScript以外を使用する場合でも）、**Node.jsのインストールは必須です**。  
  
#### Tips: Lambda関数のパス  
```NodejsFunction``` の ```entry``` で指定したLambda関数のファイルのパスですが、これは相対パスで指定した場合「**```npx cdk deploy``` コマンドを実施した際のカレントフォルダからの相対パス**」になります。（「```NodejsFunction``` コンストラクタを定義したファイルからの相対パス」**ではありません**）  
  
基本的に```npx cdk deploy``` コマンドはプロジェクトフォルダ直下（=```cdk.json```が存在するフォルダ）で実施する事が多いので（そうじゃないとエラーになる）、これを知っていないとデプロイ時に意図せず「『entryで指定されたLambdaファイルが存在しないエラー』でデプロイができない！」ということが起こるので注意しましょう。  
  
上記エラーを回避したい場合、Node.jsの```path```モジュールを使い、```entry``` を下記のように定義します。(なお下記コードを適用する場合、```tsconfig.json``` の ```compilerOptions``` に```esModuleInterop:true``` の設定を追加する必要があります。)  
  
```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

// Node.jsのpathモジュールを使用する
import path from 'path';

export class JawsUgKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const lambdafunc = new NodejsFunction(this, "NodeJsLambdaFunction", {
      // path.resolve(__dirname)でこのファイルが存在するフォルダの
      // 絶対パスを取得後、Lambdaファイルを参照する
      entry: path.resolve(__dirname, 'lambda.ts'),,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
    });
  }
}
```

#### Tips: NodejsFunctionを使う理由
今回、Lambda関数の定義に ```aws-cdk-lib/aws-lambda-nodejs``` の ```NodejsFunction``` を使用しました。  
ただ、これ以外に ```aws-cdk-lib/aws-lambda``` の ```Function``` を使用する方法でもLambda関数を定義できます。（むしろこちらの方が一般的）  
  
ただしLambda関数をTypeScriptで記載している場合、```NodejsFunction``` を使用すると「**バンドル＆トランスパイル処理をAWS CDK側で自動で実施してくれる**」という利点があるので、Lambda関数をTypeScriptで記載する場合は、```NodejsFunction``` を活用すると良いと思います。(```Function``` にそのような機能はありません。またLambda関数自体はTypeScriptのままでは実行できません。)  
  
逆に、そうではない場合や「バンドル＆トランスパイル処理をカスタマイズしたい」など、何らかの理由であえてバンドル＆トランスパイル処理を手動で実施したい場合は、```Function```を使用してください。  
  
ちなみに、```NodejsFunction``` でバンドル＆トランスパイル処理を実施する際、esbuildがインストールされている場合はesbuildが、そうではない場合はDockerが使用されます。  
esbuildの方がDockerよりも準備が簡単なため、今回のワークショップではesbuildを使用しています。（最初にesbuildを```npm i -D``` したのはそのため）  
  
### 参考: AWS CDKを使うメリット  
```NodejsFunction``` の ```environment```（環境変数の設定）において、```dynamoDbTable.tableName``` のようにDynamoDBのテーブル名を参照しています。  
  
AWS CDKではプログラミング言語を用いて各種AWSリソースを定義しますが、プログラミング言語を用いるということは、このように「**クラスインスタンスのメンバ変数を扱う形式（```インスタンス変数.メンバ変数名```）で、簡単にリソースのプロパティを参照できる**」というメリットがあります。  
  
またプログラミング言語を用いるということは「コードエディタにてインテリセンス機能の恩恵を受けられる」ということでもあります。  
これもAWS CDKを採用するメリットです。  
  
その他「AWS CDKでのリソース管理」という点でも、ハードコーディングと比較して以下のメリットがあります。  
  
#### 参照する側のソース変更が不要  
もし参照される側のプロパティ（今回の場合 ```dynamoDbTable.tableName``` ）が変更されても、参照する側（今回の場合 ```environment.TABLE_NAME```）のソースを変更する必要はありません。  
そのため変更を最小限にすることができ、「参照する側の変更し忘れによるデプロイエラー」を防ぐことができます。  
  
#### デプロイ時の依存関係・デプロイ順序を明確にできる  
リソースクラスインスタンスのプロパティを参照することで、参照されるリソースと参照するリソースの依存関係を明確にすることができます。  
たとえば今回の場合、「Lambda関数はDynamoDBテーブルを作成した後でないとデプロイできない」ということを明確に出来ます。  
  
またリソースの依存関係を明確にすることで、デプロイ時にCloudFormationに「必ず参照されるリソースを先に作成させる」事ができるので、「参照する側のリソースを先に作成してしまい、参照するリソースがないためデプロイエラーになってしまう」という現象を防ぐことができます。   
  
#### Tips: 何でAWS SDK for JavaScript v3 がdevDependenciesなのにJawsugKanazawaNodeJsLambdaFunction関数が正常に動くの？
今回、JawsugKanazawaNodeJsLambdaFunction関数のソースでAWS SDK for JavaScript v3（```@aws-sdk/client-dynamodb``` および ```@aws-sdk/lib-dynamodb```, 以後「AWS SDK v3」と記載）を使用しています。  
しかし「AWS CDKプロジェクトの作成+α」にて、AWS SDK v3は ```devDependencies``` としてインストールしているので、本来バンドルは行われず、JawsugKanazawaNodeJsLambdaFunction関数は正しく実行されないはずです。（実際、デプロイされたJawsugKanazawaNodeJsLambdaFunction関数のコードは以下の通りで、バンドルは行われていません）  
  
```javascript
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/lambda.ts
var lambda_exports = {};
__export(lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(lambda_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var handler = async (event, context) => {
  const client = new import_client_dynamodb.DynamoDBClient({});
  const docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
  const command = new import_lib_dynamodb.ScanCommand({
    TableName: process.env.TABLE_NAME
  });
  const response = await docClient.send(command);
  const result = {
    statusCode: 200,
    headers: {
      contentType: "application/json"
    },
    body: JSON.stringify(response.Items)
  };
  return result;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});

```
  
ではなぜ、JawsugKanazawaNodeJsLambdaFunction関数は正常に実行されるのでしょうか？  
  
実はLambda関数が実行される環境（Amazon Linux 2023）には、AWS SDK v3を始め、一部のnpmモジュールがプリインストールされています。  
そのため、AWS SDK v3をバンドルしなくても、JawsugKanazawaNodeJsLambdaFunction関数は正常に動作する...というわけです。  
  
逆に、プリインストールされているnpmモジュールは ```devDependencies``` にしてバンドルを実施しないことで、デプロイパッケージのサイズを少なくできるというメリットもあります。（同様の理由で、AWS Lambda Powertoolsもバンドルしない事を公式ページで推奨しています）  
  
#### Tips：GrantXXXメソッドについて
上記で記載したGrantXXX系メソッドですが、実際には「最小権限の原則」に則っていないというケースがあります。（例えば今回の場合、```Scan``` だけ許可すればよいのに ```Get``` や ```Query``` も許可されている）  
  
これに関しては、ケースバイケースというか「それを許容できるか」という観点でGrantXXX系メソッドの使用可否を決めるとよいと思います。  
  
個人的には「アクセス権限の実行がシンプル」「設定ミスが少なくなる」という理由でGrantXXX系メソッドを使用した方が良いと思っていますが、そこはプロジェクトの状況などから判断してください。