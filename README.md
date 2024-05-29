# 20240608-jawsug-kanazawa-cdk-workshop  
  
## はじめに  
このドキュメントは2024/06/08(土) 開催の「[JAWS-UG金沢 #99 CDKワークショップやってみよう](https://jawsug-kanazawa.doorkeeper.jp/events/172615)」の手順書になります。  
  
## 参考資料  
  
- [AWS CDKの開始方法(AWS公式ドキュメント)](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/getting_started.html)
- [AWS CDKを始めるハンズオン ─ IaCの第一歩をAWS LambdaDynamoDBのシンプルな仕組みで学ぶ(AWS 吉川さんのブログ)](https://en-ambi.com/itcontents/entry/2023/04/27/093000/)  


## 目次  
  
1. 事前準備  
1. 今回作成する構成
1. AWS CDKプロジェクトの作成+α  
1. AWS Lambdaの作成  
1. AWSにデプロイする
1. S3バケットの作成  
1. IAMポリシー＆ロールの作成  
1. IGrantable メソッドの利用
1. API Gatewayの作成
1. 後片付け
  
## 事前準備  
今回のCDKワークショップでは、下記が必要になります。(他にもありますが省略)  
  
- AWS CDK v2
- AWS CLI v2
- Node.js
- 初期化
  
### AWS CDK v2 および AWS CLI v2について
AWS CDK v2およびAWS CLI v2については、下記AWS公式ドキュメントを参考にインストールしてください。(分からない点があれば聞いてください。)

- [AWS CDKの開始方法](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/getting_started.html)
- [AWS CLI の開始方法](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-chap-getting-started.html)
  
※「AWS CDKの開始方法」は日本語だとかなり前衛的(意味深)な文章なので、英語表記の方が読みやすいかも...
  
#### TypeScriptについて
上記公式ドキュメントでは ```npm -g install typescript``` コマンドでTypeScriptをグルーバルインストールしていますが、本ワークショップではグルーバルインストールは不要です。(```npm install``` でローカルインストールする)

#### 認証情報について
上記公式ドキュメントでは、認証方法について AWS IAM Identity Center の使用が推奨されていますが、本ワークショップではIAMユーザーのクレデンシャル情報(アクセスキー＆シークレットアクセスキー）を使用します。  
  
クレデンシャル情報をローカルPCで使用する方法ですが、下記リンク先の「AWS CLIコマンドを使用した設定」の「Long-term credentials」タブを参考にAWS CLIの認証情報を作成してください
  
[AWS CLI の開始方法 - 新しい設定と認証情報のセットアップ](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-quickstart.html#getting-started-quickstart-new)
  
#### ブートストラップについて
AWS CDKの利用前に「ブートストラップ」と呼ばれる、AWS CDK専用のリソースを作成する作業が1度だけ必要になります。(すでに実施済の場合、この作業は不要です)  
  
ブートストラップは、以下のコマンドで実施できます。  

```sh
## ブートストラップのコマンド
npx cdk bootstrap aws://<アカウント番号>/<リージョン>
  
## 例えばアカウント番号123456789012, 東京リージョン(ap-northeast-1)でブートストラップを実施する場合、下記コマンドを実行する
npx cdk bootstrap aws://123456789012/ap-northeast-1
  
## デフォルト以外のAWS CLIクレデンシャル情報を使用したい場合、下記のようにprofileオプション＆プロファイル名を指定する
## これは他のcdkコマンドでも共通。（以後、この説明は省略します）
npx cdk bootstrap aws://123456789012/ap-northeast-1 --profile my-profile-name
```
    
ブートストラップの補足事項としては下記の通りです  
  
- ブートストラップはリージョン単位で実施が必要です。  
  - 例えば「東京リージョンでは実施済だが、大阪リージョンでは未実施」の場合、大阪リージョンでAWS CDKを使用する際は事前にブートストラップを実施する必要があります。
- ブートストラップで作成されるAWS CDK専用のリソースとして、S3バケットやAmazon ECR等があります
    
### Node.js について  
自分のPCにNode.jsがインストールされていない場合、[Node.js公式サイト](https://nodejs.org/en/download/package-manager) を参考に、v20(LTS)のインストールを行ってください。(インストール済みの場合、よほどバージョンが古くない限りは新たにインストールする必要はありません。とりあえずv16で正常動作するのは確認済)
  
### プログラム言語について  
今回のワークショップでは、プログラム言語はTypeScriptを使用します。  
  
AWS CDKでは、プログラム言語はTypeScriptで記載する事が多いです。(AWS CDK自体がTypeScriptで実装されているため)  
  
なおAWS CDKは下記のプログラム言語をサポートしています。
  
- TypeScript
- JavaScript
- Python
- Java
- C#
- Go
  
ちなみに、どのプログラム言語を使用する場合でも(TypeScriptやJavaScript以外を使用する場合でも)、**Node.jsのインストールは必須です**。

## 今回作成する構成  
今回最終的に作成する構成は、下図の通りです。(サーバーレスでよくある、RESTful APIの構成になります。)  
  
![最終的な構成](jawsug-kanazawa-cdk-workshop.drawio.png)
  

## AWS CDKプロジェクトの作成+α    
まず初めに、AWS CDKプロジェクトを作成します。  
ターミナルで以下のコマンドを実行してください。(わざわざ専用フォルダを作成するのは、空のフォルダじゃないと ```cdk init``` が実行できないからです)
  
```sh
mkdir cdk
cd cdk
npx cdk init app --language typescript
```
  
すると下記の確認メッセージが表示されると思うので、「y」を押してプロジェクト作成を実施してください。色々処理が実行されます。  
最終的に「All done!」という表示がされればOKです。    

```sh
Need to install the following packages:
cdk@2.143.0
Ok to proceed? (y) 
```

すると、cdkフォルダ以下に下記ファイル＆フォルダが作成されると思います。

```sh
cdk
├── README.md
├── bin
│   └── cdk.ts
├── cdk.json
├── jest.config.js
├── lib
│   └── cdk-stack.ts
├── node_modules
│   └── (以下略)
├── package-lock.json
├── package.json
├── test
│   └── cdk.test.ts
└── tsconfig.json
```
  
そうしたら、ターミナルで下記コマンドを実施し、追加で必要なnpmモジュールを```devDependencies```としてインストールします。  
  
```sh 
npm i -D @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @types/aws-lambda esbuild
```
  
TODO: 消すかも
また、```tsconfig.json``` に「"esModuleInterop": true」の定義を追加します。

最後に、```example/cdk/lib/lambda.ts``` ファイルを ```lib``` フォルダにコピーして、カレントフォルダをlibフォルダに移動します。  
```sh 
cp example/cdk/lib/lambda.ts ./lib
cd ./lib
```
  
では、次からは実際にAWS CDKでリソースを作成します。  
  
## AWS Lambdaの作成
まず一番初めに、AWS Lambdaを作成します。  
  
```cdk-stack.ts``` ファイルを開くと、下記のようなソースコードが書かれていると思います。  
「The code that defines your stack goes here(訳：スタックを定義するコードはここに書く)」とある通り、CloudFormationスタックに作成するリソースは、このファイル内で定義しますので、ここにAWS Lambdaの定義を記載します。  

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
```
  
ちなみに「このスタック情報はどこから参照されているか」ですが、```bin/cdk.ts``` に下記コードがあり、ここで「このプロジェクト扱うスタック」として参照されています。  

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

const app = new cdk.App();
new CdkStack(app, 'CdkStack', {
  // コメントは省略
});
```

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
+ import { Runtime } from "aws-cdk-lib/aws-lambda";
+ import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class JawsUgKanazawaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
+    const lambdafunc = new NodejsFunction(this, "NodeJsLambdaFunction", {
+      entry: './lambda.ts',
+      runtime: Runtime.NODEJS_20_X,
+      handler: 'handler',
+    });
  }
}

```