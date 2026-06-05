# Receipt System

This is an application where users their receipts and get a detailed breakdown of all their expenses by store or category. It also lets you filter them by date.

![Receipt System architecture](/assets/receipt.system-architecture.png)

## Documentation

- [How to run this project](#how-to-run-this-project)
- [Set up AWS](#set-up-aws)
  - [Amazon Cognito](#amazon-cognito)
  - [S3](#s3)
  - [CloudFront](#cloudfront)

## How to run this project

(Content)

## Set up AWS

For this project every single AWS resource must be created in the **us-east-1** region.

### Amazon Cognito

Navigate to **Amazon Cognito** -> **User Pools**, and _Create user pool_.

| Properties                      | Values                  |
| ------------------------------- | ----------------------- |
| Application type                | Single Page Application |
| Options for sign-in identifiers | Email                   |
| Self-registration               | Enabled                 |
| Required attributes for sign-up | email                   |
| Add a return URL                | http://localhost:5173   |

---

### S3

Navigate to **S3** and _Create bucket_.

- First bucket for frontend hosting:

| Properties              | Values                                                      |
| ----------------------- | ----------------------------------------------------------- |
| Bucket type             | General purpose                                             |
| Bucket name             | w-rs-bk-frontend                                            |
| Block all public access | Enabled                                                     |
| Bucket Versioning       | Enabled                                                     |
| Encryption type         | Server-side encryption with Amazon S3 managed keys (SSE-S3) |
| Bucket key              | Enabled                                                     |

- Second bucket to store user receipts:

| Properties              | Values                                                      |
| ----------------------- | ----------------------------------------------------------- |
| Bucket type             | General purpose                                             |
| Bucket type             | w-rs-bk-receipts                                            |
| Block all public access | Enabled                                                     |
| Bucket Versioning       | Enabled                                                     |
| Encryption type         | Server-side encryption with Amazon S3 managed keys (SSE-S3) |
| Bucket key              | Enabled                                                     |

Inside the second buket generate the following folder structure:

```
w-rs-bk-receipts
├── users/
├── processing/
├── processed/
└── failed/
```

The create a lifecycle rule, navigate to **w-rs-bk-receipts** -> **Management**, and _Create lifecycle rule_.

| Properties                                                           | Values                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Lifecycle rule name                                                  | w-rs-archive-old-receipts                                   |
| Scope rule                                                           | Apply to all objects in the bucket                          |
| Delete expired object delete markers or incomplete multipart uploads | Enabled                                                     |
| Delete expired object delete markers                                 | Enabled                                                     |
| Encryption type                                                      | Server-side encryption with Amazon S3 managed keys (SSE-S3) |
| Bucket key                                                           | Enabled                                                     |

Finally add the following CORS configuration, navigate to **w-rs-bk-receipts** -> **Permissions** -> **CORS**, and _Edit_.

```
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "HEAD"
    ],
    "AllowedOrigins": [
      "http://localhost:5173"
    ],
    "ExposeHeaders": [
      "ETag"
    ]
  }
]
```

---

### CloudFront

Navigate to **CloudFront** and _Create distribution_.

| Properties                                   | Values                             |
| -------------------------------------------- | ---------------------------------- |
| Distribution name                            | w-rs-distribution                  |
| Distribution type                            | Single website or app              |
| Origin type                                  | S3                                 |
| S3 origin                                    | w-rs-bk-frontend                   |
| Allow private S3 bucket access to CloudFront | Enabled                            |
| Origin settings                              | Enabled                            |
| Cache settings                               | Enabled                            |
| Web Application Firewall                     | Do not enable security protections |

Then, navigate to **Error pages** and _Create custom error response_.

- First error response:

| Properties                | Values         |
| ------------------------- | -------------- |
| HTTP error code           | 403: Forbidden |
| Error caching minimum TTL | 10             |
| Customize error response  | Yes            |
| Response page path        | /index.html    |
| HTTP Response code        | 200: OK        |

- Second error response:

| Properties                | Values         |
| ------------------------- | -------------- |
| HTTP error code           | 404: Not Found |
| Error caching minimum TTL | 10             |
| Customize error response  | Yes            |
| Response page path        | /index.html    |
| HTTP Response code        | 200: OK        |

---
