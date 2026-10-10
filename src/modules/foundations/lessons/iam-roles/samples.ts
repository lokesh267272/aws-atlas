/** Code and policy samples shown in the lesson. All values are AWS documentation examples. */

export const badCode = `import boto3

# Don't do this: a long-term access key pasted into code
s3 = boto3.client(
    "s3",
    aws_access_key_id="AKIAIOSFODNN7EXAMPLE",
    aws_secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
)
photo = s3.get_object(Bucket="example-photos", Key="beach.jpg")`

export const badCodeHighlight = [6, 7]

export const goodCode = `import boto3

# No keys. On EC2 the SDK finds the role's
# temporary credentials by itself.
s3 = boto3.client("s3")
photo = s3.get_object(Bucket="example-photos", Key="beach.jpg")`

export const goodCodeHighlight = [5]

export const trustPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}`

export const trustPolicyHighlight = [6, 7]

export const permissionsPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-photos/*"
    }
  ]
}`

export const permissionsPolicyHighlight = [6, 7]

export const assumeRoleCli = `$ aws sts assume-role \\
    --role-arn arn:aws:iam::123456789012:role/DeveloperReadOnly \\
    --role-session-name akua
{
    "Credentials": {
        "AccessKeyId": "ASIAIOSFODNN7EXAMPLE",
        "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "SessionToken": "AQoDYXdzEPT//////////wEXAMPLEtc764bNrC9SAPBSM22wDOk4x4HIZ8j4FZTwdQW…",
        "Expiration": "2026-10-03T10:00:00Z"
    },
    "AssumedRoleUser": {
        "AssumedRoleId": "AROA3XFRBF535PLBIFPI4:akua",
        "Arn": "arn:aws:sts::123456789012:assumed-role/DeveloperReadOnly/akua"
    }
}`

export const assumeRoleCliHighlight = [6, 7, 8, 9]
