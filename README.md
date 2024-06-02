# 20240608-jawsug-kanazawa-cdk-workshop  
  
## はじめに  
このドキュメントは2024/06/08(土) 開催の「[JAWS-UG金沢 #99 CDKワークショップやってみよう](https://jawsug-kanazawa.doorkeeper.jp/events/172615)」のワークショップ作業の手順書になります。  
  
## 参考資料  
  
- [AWS CDKの開始方法(AWS公式ドキュメント)](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/getting_started.html)
- [AWS CDKを始めるハンズオン ─ IaCの第一歩をAWS LambdaDynamoDBのシンプルな仕組みで学ぶ(AWS ゆっきーさんのブログ)](https://en-ambi.com/itcontents/entry/2023/04/27/093000/)  

## 注意事項  
### example フォルダについて  
```20240608-jawsug-kanazawa-cdk-workshop``` フォルダ直下に ```example``` フォルダがあります。  
この ```example``` フォルダには、このワークショップを最後まで実施した際の最終的なフォルダ＆ファイルが格納されていますので、もしワークショップの途中で分からなくなってしまった際に参照してください。（ただしAWS CDKのコードは、できるだけコピペせず手作業で入力することをお勧めします）

### 「参考」および「Tips」について
各項目で「参考」および「Tips」として、参考情報（知っているとちょっと役に立つ情報）を記載しています。  
  
「参考」にはAWS CDKを扱う際に知っておいた方がよい情報を記載していますので、デプロイの待ち時間などに読んでみてください。  
「Tips」については、このワークショップにおいて必須...という訳でもないので「ワークショップをどんどん進めていきたい」という方は読み飛ばしてしまって構いません。（時間があったらちょっと読む...くらいでOK）  
  
### Hotswap デプロイについて  
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
## 目次  
  
1. 事前準備  
1. 今回作成する構成
1. AWS CDKプロジェクトの作成+α  
1. AWS Lambdaの作成  
1. AWSにデプロイする
1. DynamoDBテーブルの作成  
1. IAMポリシー＆ロールの作成  
1. GrantXXX メソッドの利用
1. API Gatewayの作成
1. 後片付け
  
## 事前準備  
今回のCDKワークショップでは、下記が必要になります。  
  
- AWS CDK v2
- AWS CLI v2
- Node.js
- Rest API クライアント
  
### AWS CDK v2 および AWS CLI v2について
AWS CDK v2およびAWS CLI v2については、下記AWS公式ドキュメントを参考にインストールしてください。（分からない点があれば聞いてください）

- [AWS CDKの開始方法](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/getting_started.html)
- [AWS CLI の開始方法](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-chap-getting-started.html)
  
※「AWS CDKの開始方法」は日本語だとかなり前衛的(意味深)な文章なので、英語の方が読みやすいかも...
  
#### TypeScriptについて
上記公式ドキュメントでは ```npm -g install typescript``` コマンドでTypeScriptをグルーバルインストールしていますが、本ワークショップではグルーバルインストールは不要です。(```npm install``` でローカルインストールする)

#### 認証情報について
上記公式ドキュメントでは、認証方法について AWS IAM Identity Center の使用が推奨されていますが、本ワークショップではIAMユーザーのクレデンシャル情報(アクセスキー＆シークレットアクセスキー）を使用します。（クレデンシャル情報の作成方法が分からない方がいたら教えてください） 
  
クレデンシャル情報をローカルPCで使用する方法ですが、下記リンク先の「AWS CLIコマンドを使用した設定」の「Long-term credentials」タブを参考にAWS CLIの認証情報を作成してください。
  
[AWS CLI の開始方法 - 新しい設定と認証情報のセットアップ](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-quickstart.html#getting-started-quickstart-new)
  
なお使用するIAMユーザーに「AdministratorAccess」ポリシーがアタッチされていない場合、一時的にアタッチしてください。（本ワークショップが完了したらデタッチして構いません）  
  
#### ブートストラップについて
AWS CDKの利用前に「ブートストラップ」と呼ばれる、AWS CDK専用のリソースを作成する作業が1度だけ必要になります。(すでに実施済の場合、この作業は不要です)  
  
ブートストラップは、以下のコマンドで実施できます。  

```sh
## ブートストラップのコマンド
npx cdk bootstrap aws://<アカウント番号>/<リージョン>
  
## 例えばアカウント番号123456789012, 東京リージョン(ap-northeast-1)でブートストラップを実施する場合、下記コマンドを実行する
npx cdk bootstrap aws://123456789012/ap-northeast-1
  
## デフォルト(default)以外のAWS CLIクレデンシャル情報を使用したい場合、下記のようにprofileオプション＆プロファイル名を指定する
## これは他のcdkコマンドでも共通。（以後、この説明は省略します）
npx cdk bootstrap aws://123456789012/ap-northeast-1 --profile my-profile-name
```
    
ブートストラップの補足事項は、下記の通りです  
  
- ブートストラップはリージョン単位で実施が必要です。  
  - 例えば「東京リージョンでは実施済だが、大阪リージョンでは未実施」の場合、大阪リージョンでAWS CDKを使用する際は事前にブートストラップを実施する必要があります。
- ブートストラップで作成されるAWS CDK専用のリソースとして、S3バケットやAmazon ECRなどがあります
    
### Node.js について  
自分のPCにNode.jsがインストールされていない場合、[Node.js公式サイト](https://nodejs.org/en/download/package-manager) を参考に、v20のLTSバージョンのインストールを行ってください。（すでにNode.jsをインストール済みの場合、よほどバージョンが古くない限りは新たにインストールする必要はありません。とりあえずv16で正常動作するのは確認済）

### Rest API クライアント
今回のワークショップでは、最後にRest APIのリクエストを送信します。  
そのため、リクエストを送信できるRest APIクライアントが必要になります。(```curl``` コマンドでもOKです)  
  
例えばVS Codeだと下記拡張機能があるので、必要に応じてインストールしてください。（他のエディタは分からないので、各自調べてみてください）  
  
- [Postman](https://marketplace.visualstudio.com/items?itemName=Postman.postman-for-vscode)
- [Rest Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client)  
  
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
  
## 今回作成する構成  
今回最終的に作成する構成は、下図の通りです。（サーバーレスでよくある、Rest APIの構成になります）  
  
![最終的な構成](./images/cdk-workshop.png)
  

## AWS CDKプロジェクトの作成+α    
まず初めに、AWS CDKプロジェクトを作成します。  
ターミナルで以下のコマンドを実行してください。（ ```cdk init``` は空のフォルダでないと実行できません）
  
```sh
mkdir jawsug-kanazawa-cdk
cd jawsug-kanazawa-cdk
npx cdk init app --language typescript
```
  
すると下記の確認メッセージが表示されるので、「y」を押してプロジェクト作成を実施してください。色々処理が行われます。  
最終的に「All done！」と表示されればOKです。    

```sh
Need to install the following packages:
cdk@2.143.0
Ok to proceed? (y) 
```

プロジェクト作成が完了すると、```jawsug-kanazawa-cdk``` フォルダ以下に下記ファイル＆フォルダが作成されます。

```sh
jawsug-kanazawa-cdk
├── README.md
├── bin
│   └── jawsug-kanazawa-cdk.ts
├── cdk.json
├── jest.config.js
├── lib
│   └── jawsug-kanazawa-cdk-stack.ts
├── package-lock.json
├── package.json
├── test
│   └── jawsug-kanazawa-cdk.test.ts
└── tsconfig.json
```
  
次にターミナルで下記コマンドを実施し、追加で必要なnpmモジュールを```devDependencies```としてインストールします。  
  
```sh 
npm i -D @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @types/aws-lambda esbuild
```

最後に、```example/jawsug-kanazawa-cdk/lib/lambda.ts``` ファイルを ```lib``` フォルダにコピーします。  
```sh 
cp ../example/jawsug-kanazawa-cdk/lib/lambda.ts ./lib
```

なお、Windows環境の場合には以下の通りコマンドを読み替えてください。
```
copy ..\example\jawsug-kanazawa-cdk\lib\lambda.ts .\lib\
```
  
次の「AWS Lambdaの作成」から、実際にAWS CDKでリソースを作成します。  
  
なおこれ以降の手順は「```jawsug-kanazawa-cdk``` フォルダがカレントディレクトリである」という前提で記載します。
  
## AWS Lambdaの作成
まず一番初めに、AWS Lambdaを作成します。  
  
```lib/jawsug-kanazawa-cdk-stack.ts``` ファイルを開くと、下記のようなソースコードが書かれていると思います。  
「The code that defines your stack goes here(訳：スタックを定義するコードはここに書く)」とある通り、CloudFormationスタックに作成するリソースは、基本的このファイルに定義します。  
今回もここにAWS Lambdaの定義を記載します。  

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class JawsugKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'JawsugKanazawaCdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
```
  
ちなみに、「JawsugKanazawaCdkStack(=スタック情報)はどこから参照されているか」ですが、```bin/jawsug-kanazawa-cdk.ts``` に下記コードがあり、ここで「このプロジェクトで作成するスタック」として参照されています。  

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { JawsugKanazawaCdkStack } from '../lib/jawsug-kanazawa-cdk-stack';

const app = new cdk.App();
new JawsugKanazawaCdkStack(app, 'JawsugKanazawaCdkStack', {
  // コメントは省略
});
```

では、 ```lib/jawsug-kanazawa-cdk-stack.ts``` ファイルにAWS Lambdaの定義を記載します。  
```lib/jawsug-kanazawa-cdk-stack.ts``` に、下記のコードを追記してください。 

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
+ import { Runtime } from "aws-cdk-lib/aws-lambda";
+ import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class JawsUgKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
+    const lambdaFunc = new NodejsFunction(this, "NodeJsLambdaFunction", {
+      entry: './lib/lambda.ts',
+      runtime: Runtime.NODEJS_20_X,
+      handler: 'handler',
+      functionName: 'JawsugKanazawaNodeJsLambdaFunction',
+    });
+     // スタックを削除した際、このLambda関数も削除する設定
+    lambdaFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
  }
}

```
  
### AWSにデプロイする  
AWS Lambdaの定義を作成したので、さっそくAWSにデプロイします。  
  
```cdk deploy``` コマンドを実行することで、AWSにデプロイを行うことができます。  
  
```sh
npx cdk deploy
```
  
上記コマンドを実施すると、下図のように変更点の表示＆デプロイしてよいかの確認メッセージが表示されます。  
「y」を入力して、デプロイを進めましょう。  
  
![デプロイ確認](./images/cdk-workshop2.png)
  
下記のようなメッセージが表示されれば、デプロイ成功です。  

```sh
 ✅  JawsugKanazawaCdkStack

✨  Deployment time: 37.96s
```
  
### AWSマネジメントコンソールで確認する  
まずはAWSマネジメントコンソールにログインし、「CloudFormation」ページで「スタック」を表示してみてください。  
「JawsugKanazawaCdkStack」という名前のスタックが作成されているはずです。  
  
またスタック名をクリックすることで、スタックの情報が表示されると思います。  
  
![スタック＆スタックの詳細](./images/cdk-workshop14.png)

次にLambdaページを表示すると、「関数」に先程定義した「JawsugKanazawaNodeJsLambdaFunction」関数が作成されているはずです。    
  
関数名をクリックし、「テスト」タブからテストを実行すると、実際にLambda関数が実行することも確認できます。（現時点では下図のように ```errorType: ValidationException``` エラーが出ますが、これは想定通りの挙動ですので、問題ありません）  
  
![テストも実行できる](./images/cdk-workshop3.png)
  
### 参考：AWS CDKの定義の基本  
先程Lambda関数を作成する際に、```JawsUgKanazawaCdkStack```クラス（便宜上、ここでは「Stackクラス」と記載します）のコンストラクタで```NodejsFunction```クラスのコンストラクタを実行して、Lambda関数を作成しました。  
  
実はAWS CDKでのリソース作成は、ほとんどがこの「**Stackクラスのコンストラクタで、リソースクラスのコンストラクタを実行する**」だけでOKです。(ごく一部例外はありますが、基本的にほぼすべてのリソースに当てはまります)  
  
またリソースクラスのコンストラクタは、ほぼすべて以下の形式になっています。
  
> new コンストラクタ(スコープ、リソースID、props?)  
  
先程のLambda関数で言うと、それぞれ下記の通りになります。  
  
- コンストラクタ： NodejsFunction
- スコープ： ```this```
- リソースID： 文字列「NodeJsLambdaFunction」
- props： ```entry```, ```runtime``` などが定義されたオブジェクト  
    
コンストラクタ引数についての説明は、以下の通りです。  
  
|引数|説明|備考|
|:--|:--|:--|
|スコープ|そのリソースの親要素を指定する。（たいていの場合、そのリソースが存在するスタックを指定する）|クロススタック等、よほど特別なことをしない限りは ```this```(=そのリソースが定義されているスタック自身)でOK|
|リソースID|スコープ(≒スタック)内でのリソースの一意のID文字列|同一スコープ内でのリソースIDの重複はNG|
|props|「プロパティ名: プロパティ値」の組で構成されるオブジェクト|AWS Lambdaの ```runtime``` や ```entry``` など、リソースの設定を行うのに使用される|

### 参考：AWS CDK Reference Documentation について  
先述の通り、AWS CDKでのリソース定義は「Stackクラスのコンストラクタで、リソースクラスのコンストラクタを実行する」のですが、実際に自分でそれを定義しようとすると、  
  
- 〇〇のリソースを作成したいけど、コンストラクタ名が分からない
- propsに設定可能なプロパティや値が分からない
- そもそも、どのファイルをimportすればいいの？
  
といった疑問が生じると思います。
  
そういう際、ぜひ参照してほしいのが [AWS CDK Reference Documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html) です。  
  
ここにはAWS CDKで定義可能なリソースやプロパティ等について非常に詳しく書かれており、またユースケース毎の設定方法がOverviewページでドキュメント化されているので、AWS CDKを使用する際に非常に役に立ちます。  
  
むしろAWS CDKを使用する場合、たいていは「**AWS CDKのコードとAWS CDK Reference Documentationを交互ににらめっこしながら作業する**」ということになるので、このページはぜひチェックする癖をつけておいて下さい。(それくらい重要なページです)  
  
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
  
  
## DynamoDBテーブルの作成
次にDynamoDBテーブルを作成して、Lambda関数からDynamoDBテーブルのデータ取得を行えるようにします。  
```lib/jawsug-kanazawa-cdk-stack.ts``` に、下記のコードを追加してください。 

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
+ import { TableV2, AttributeType } from "aws-cdk-lib/aws-dynamodb";

export class JawsugKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
+    const dynamoDbTable = new TableV2(this, 'DynamoDbTableV2', {
+      tableName: 'JawsugKanazawaDynamoDbTableV2',
+      partitionKey: {
+        name: 'region',
+        type: AttributeType.STRING
+      },
+      sortKey: {
+        name: 'code',
+        type: AttributeType.NUMBER
+      },
+      removalPolicy: cdk.RemovalPolicy.DESTROY,
+    });
    
    const lambdaFunc = new NodejsFunction(this, "NodeJsLambdaFunction", {
      entry: './lib/lambda.ts',
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      functionName: 'JawsugKanazawaNodeJsLambdaFunction',
+      environment: {
+        TABLE_NAME: dynamoDbTable.tableName,
+      },
    });
    lambdaFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
  }
}

```
  
その後 ```npx cdk deploy``` コマンドで再度デプロイを実施すると、「JawsugKanazawaDynamoDbTableV2」という名前のDynamoDBテーブルが作成されますので、デプロイ完了後にAWSマネジメントコンソールの「テーブル」で確認してください。  
  
また、この「JawsugKanazawaDynamoDbTableV2」テーブルについて、「項目を探索 - 項目を作成」から下記4項目を追加してください。（「name」は「新しい属性の追加 - 文字列」で追加してください）  
  
|region|code|name|
|:--|:--|:--|
|hokuriku|15|niigata|
|hokuriku|16|toyama|
|hokuriku|17|ishikawa|
|hokuriku|18|fukui|
  
![項目を作成](./images/cdk-workshop4.png)
  
### Lambda関数の再実行  
「JawsugKanazawaDynamoDbTableV2」テーブル作成後、再度「JawsugKanazawaNodeJsLambdaFunction」のテストを実行してください。    
今度は下図のように ```errorType: AccessDeniedException``` のエラーが発生すると思います。（このエラーも想定通りなので、問題ありません）  

![AccessDeniedException](./images/cdk-workshop5.png)  
  
ただ「AccessDenied(=アクセスが拒否された)」ということは、少なくともJawsugKanazawaNodeJsLambdaFunction関数からJawsugKanazawaDynamoDbTableV2テーブルへのアクセスは実施されているということなので、JawsugKanazawaDynamoDbTableV2テーブルの作成自体は正常に完了しています。
  
  
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
  
  
## IAMポリシー＆ロールの作成
先程の ```AccessDeniedException``` エラーは、JawsugKanazawaNodeJsLambdaFunction関数にJawsugKanazawaDynamoDbTableV2テーブルへのアクセス許可ポリシーを持つIAMロールが付与されていないことが原因です。  
なので、次はそのアクセス権限を付与するため、IAMポリシー＆ロールをAWS CDKで作成します。  
  
なお実際にはもっと簡単にアクセス権限を付与する方法もありますが（次の「GrantXXX メソッドの利用」で説明します）、IAMポリシーはAWSのセキュリティにおける基本かつ非常に重要な要素なので、今回は最初だけあえて手作業で定義します。  
  
```lib/jawsug-kanazawa-cdk-stack.ts``` に、下記のコードを追加して、```npx cdk deploy``` コマンドでデプロイを実行してください。

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { TableV2, AttributeType } from "aws-cdk-lib/aws-dynamodb";
+ import { Role, Effect, ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";

export class JawsugKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const dynamoDbTable = new TableV2(this, 'DynamoDbTableV2', {
      tableName: 'JawsugKanazawaDynamoDbTableV2',
      partitionKey: {
        name: 'region',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'code',
        type: AttributeType.NUMBER
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

+   const role = new Role(this, 'LambdaRole', {
+     assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
+     roleName: 'JawsugKanazawaLambdaRole',
+   });
+    
+   role.addToPrincipalPolicy(new PolicyStatement({
+     actions: ['dynamodb:Scan'],
+     effect: Effect.ALLOW,
+     resources: [dynamoDbTable.tableArn],
+   }));
    
    const lambdaFunc = new NodejsFunction(this, "NodeJsLambdaFunction", {
      entry: './lib/lambda.ts',
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      functionName: 'JawsugKanazawaNodeJsLambdaFunction',
      environment: {
        TABLE_NAME: dynamoDbTable.tableName,
      },
+     role,
    });
    lambdaFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
  }
}

```
  
### Lambda関数の再実行  
デプロイ後、再度「JawsugKanazawaNodeJsLambdaFunction」のテストを実行してください。   
今度は下図のようにテスト実行が正常終了し、```body``` に「DynamoDBテーブルの作成」で登録した値が格納されていると思います。  
   
![正常終了](./images/cdk-workshop6.png)  
  
また「『設定』タブ - アクセス権限」を確認すると、JawsugKanazawaDynamoDbTableV2テーブルに対するScan（=全データ取得）が許可されていることが分かります。    
  
![アクセス権限](./images/cdk-workshop7.png)  
  
そして「ロール名」に表示されている「JawsugKanazawaLambdaRole」をクリックすると、IAMページに移動します。  
そこで先程定義したIAMロール「JawsugKanazawaLambdaRole」およびそのポリシーが正しく作成されていることが確認できます。  
  
また「信頼関係」タブを表示すると、Lambdaに対して ```sts:AssumeRole``` が許可されていることも確認できます。  
    
![IAMポリシー＆ロール](./images/cdk-workshop8.png)  
![AssumeRole](./images/cdk-workshop9.png)  
  
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
  
  
## GrantXXX メソッドの利用  
先程の「IAMポリシー＆ロールの作成」で、IAMポリシー＆ロールを作成してアクセス権限を付与しました。  
しかし、実際に全リソースに対しIAMポリシー＆ロールを作成するとなると非常に手間がかかりますし、管理も大変です。  
  
そこでAWS CDKでは、アクセス権限を簡単に付与するための「grant」から始まるメソッドが初めから用意されており（便宜上「GrantXXXメソッド」と記載します）、アクセス権限の設定が非常にシンプルに実施できます。    
  
今回はこの「GrantXXXメソッド」にてアクセス権限の設定を行います。  
  
### アクセス権限の削除＆GrantXXX メソッドの利用  
まずは ```lib/jawsug-kanazawa-cdk-stack.ts``` から、先程の「IAMポリシー＆ロールの作成」で追加したコードを全て削除（あるいはコメントアウト）して、 ```npx cdk deploy``` コマンドでデプロイを実施してください。  
  
デプロイが完了したら再度「JawsugKanazawaNodeJsLambdaFunction」のテストを実行して、```errorType: AccessDeniedException``` のエラーが再度発生する事を確認してください。（「『設定』タブ - アクセス権限」の表示内容も変わっています。）  
  
上記を確認したら、```lib/jawsug-kanazawa-cdk-stack.ts``` において、```JawsugKanazawaCdkStack``` クラスのコンストラクタの末尾に ```dynamoDbTable.grantReadData()``` メソッドを追加します。（下記コードを参照）  
  
```typescript
// import文は省略
export class JawsugKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // ...(中略)
    lambdaFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    
    // この1行を追加する
+   dynamoDbTable.grantReadData(lambdaFunc);
  }
}
```
  
その後、 再度 ```npx cdk deploy``` コマンドでのデプロイ、および「JawsugKanazawaNodeJsLambdaFunction」のテストを実行します。  
今度はテスト実行が正常終了し、「IAMポリシー＆ロールの作成」と同様 ```body``` に「DynamoDBテーブルの作成」で登録した値が格納されていると思います。 
  
また「ロール名」に表示されているロールをクリックしてIAMページに移動すると、そのロールの「許可ポリシー」にJawsugKanazawaDynamoDbTableV2テーブルへのアクセス許可ポリシー(読み取り専用ポリシー)が付与されていることが分かります。  
  
つまり、**```dynamoDbTable.grantReadData(lambdaFunc)``` の1行だけで、アクセス権限の付与が行える**わけです。便利！  
  
ちなみに、「JawsugKanazawaNodeJsLambdaFunction」のテストで相変わらず ```errorType: AccessDeniedException``` のエラーが発生する場合、再度デプロイを行ってみてください。  
またその際「IAM Statement Change」に下記の表示がされているかを確認してください。（下記の表示がされているなら、そのデプロイを実行すればテストは正常終了するはずです）  
  
![IAM Statement Change](./images/cdk-workshop10.png)  
  
#### Tips：GrantXXXメソッドについて
上記で記載したGrantXXX系メソッドですが、実際には「最小権限の原則」に則っていないというケースがあります。（例えば今回の場合、```Scan``` だけ許可すればよいのに ```Get``` や ```Query``` も許可されている）  
  
これに関しては、ケースバイケースというか「それを許容できるか」という観点でGrantXXX系メソッドの使用可否を決めるとよいと思います。  
  
個人的には「アクセス権限の実行がシンプル」「設定ミスが少なくなる」という理由でGrantXXX系メソッドを使用した方が良いと思っていますが、そこはプロジェクトの状況などから判断してください。
  

## API Gatewayの作成
ここまででLambda⇔DynamoDB間のデータのやり取りが出来ることを確認しました。  
が、実際の環境ではこのような処理をRest APIのリクエストをトリガに行うことが多いので（いわゆる「イベントドリブン」）、最後にAPI Gatewayを作成して、Rest APIのリクエストをトリガにして処理を実施するようにします。
  
```lib/jawsug-kanazawa-cdk-stack.ts``` に、下記のコードを追加して、再度 ```npx cdk deploy``` コマンドでデプロイを実行してください。  
  
```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { TableV2, AttributeType } from "aws-cdk-lib/aws-dynamodb";
+ import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";

export class JawsugKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // ...(中略)
    
    dynamoDbTable.grantReadData(lambdaFunc);
    
+   const apiGw = new RestApi(this, 'ApiGatewayRestApi', {
+     restApiName: 'JawsugKanazawaRestApi',
+     deployOptions: {
        // stageNameは省略した場合「prod」になります。
+       stageName: 'test'
+     }
+   });
+
+   const apiGwResource = apiGw.root.addResource('jawsug');
+   apiGwResource.addMethod('GET', new LambdaIntegration(lambdaFunc));
  }
}
```

### API Gateway及びRest APIリクエストの確認
デプロイが完了したら、AWSマネジメントコンソールの「API Gateway」ページを表示してください。  
「API」に先程作成した「JawsugKanazawaRestApi」が作成されていると思います。  
  
また「JawsugKanazawaRestApi」の「リソース - /jawsug - GET」を確認すると「JawsugKanazawaNodeJsLambdaFunction」が実行されることが、そして「ステージ - test - / - /jawsug - GET」を確認すると、Rest APIリクエスト用のURLが確認できます。  
  
![リソース](./images/cdk-workshop11.png)  
![ステージ](./images/cdk-workshop12.png)  
  
上記を確認したら、実際にRest APIリクエスト用のURLに「事前準備」で用意したRest API クライアントを使用してリクエストを送信してください。  
  
問題なければ、ステータスが「200 OK」で、```body``` に「DynamoDBテーブルの作成」で登録した値が格納されたレスポンスが返ってくると思います。（下図はVS Code拡張機能「Postman」で確認）

![リクエスト結果](./images/cdk-workshop13.png)  
  
ここまでで、今回のワークショップの作業は一通り完了です。お疲れさまでした。  
もし時間があったら、ぜひ自分でも色々試してみてください。(例えば下記)  
  
- S3バケットやSQSなど、他のリソースを追加する
- JawsugKanazawaDynamoDbTableV2テーブルへのデータの書き込みを許可する
- JawsugKanazawaRestApiに対し、リソースポリシーを設定する
  - 自分しか各種Lambda関数の実行を許可しない...など  
  
この後「もう今回のワークショップのリソースは必要ない」という方は、下記の「後片付け」を参考に、作成したリソースの削除を行ってください。  
「後で参照したいから残しておきたい」という方は、そのままで構いません。（課金に関しては自己責任でお願いします。ただし今回のワークショップで作成したリソースは、よほど実行回数が多くない限り、課金は発生しないはずです）  
  
## 後片付け
では、最後に作成したリソース＆CloudFormationスタックを全て削除します。  
リソース＆CloudFormationスタックを削除するは、下記の```cdk destroy```コマンドを実施します  

```sh
npx cdk destroy
```
  
すると下記の確認メッセージが表示されるので、削除対象のスタックが「JawsugKanazawaCdkStack」であることを確認して、「y」で削除を実行してください。  
> Are you sure you want to delete: JawsugKanazawaCdkStack (y/n)?  
  
下記のメッセージが表示されれば、削除成功です。  

```sh
JawsugKanazawaCdkStack: destroying... [1/1]

 ✅  JawsugKanazawaCdkStack: destroyed
```
  
あとはAWSマネジメントコンソールで、今回作成したリソースがないことを確認してください。   
  
- CloudFormationスタック(JawsugKanazawaCdkStack)
- Lambda関数(JawsugKanazawaNodeJsLambdaFunction)
- DynamoDBテーブル(JawsugKanazawaDynamoDbTableV2)
- API Gateway(JawsugKanazawaRestApi)
- IAMロール&IAMポリシー(「Kanazawa」で検索して出てこなければOK)  
   
これで後片付けも終了です。お疲れさまでした！  
  
- 「事前準備」においてIAMユーザーやAWS CLIの認証情報などを手作業で作成した場合は、必要に応じて手作業で削除を行ってください。  
- IAMユーザーに「AdministratorAccess」ポリシーをアタッチした場合、忘れずにデタッチをしておいてください。  
  
