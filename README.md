# Receipt System

This is an application where users their receipts and get a detailed breakdown of all their expenses by store or category. It also lets you filter them by date.

![Receipt System architecture](/assets/receipt.system-architecture.png)

## Documentation

- [How to run this project](#how-to-run-this-project)
- [Set up AWS](#set-up-aws)
  - [Amazon Cognito](#amazon-cognito)

## How to run this project

### Amazon Cognito

Navigate to **Amazon Cognito** -> **User Pools**, and _Create user pool_.

- Application type: Traditional Web Application
- Options for sign-in identifiers: Email
- Self-registration: Enable
- Required attributes for sign-up: email
- Add a return URL: http://localhost:3000
