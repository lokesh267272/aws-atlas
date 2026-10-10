/** The kinds of question in the module quiz. Shown to the learner as a small label. */
export type QuizFormat = 'choice' | 'true' | 'scenario' | 'policy' | 'arn'

export const formatLabel: Record<QuizFormat, string> = {
  choice: 'Multiple choice',
  true: 'Find the true statement',
  scenario: 'Scenario',
  policy: 'Read the policy',
  arn: 'Read the ARN',
}

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  /** Lesson in this module that teaches the idea (for the review link) */
  lessonId: string
  /** A few words naming the idea, used in the results list */
  topic: string
  format: QuizFormat
  prompt: string
  /** Optional code or ARN shown under the prompt */
  code?: { code: string; title: string; lang: 'json' | 'text' }
  /** Draw the options in the code font (for Region codes and similar) */
  monoOptions?: boolean
  options: QuizOption[]
  /** Id of the correct option */
  answer: string
  explanation: string
}

const denyWinsPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      "Action": "s3:DeleteObject",
      "Resource": "arn:aws:s3:::example-bucket/*"
    }
  ]
}`

const readOnlyPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-bucket/*"
    }
  ]
}`

/** Twelve questions, in the order the module teaches the ideas. */
export const quizQuestions: QuizQuestion[] = [
  {
    id: 'patching',
    lessonId: 'cloud-basics',
    topic: 'Who patches a server you rent',
    format: 'scenario',
    prompt:
      'You rent a virtual server from Amazon EC2 and run your shop’s website on it. A security update comes out for the server’s operating system. Under the shared responsibility model, who installs it?',
    options: [
      { id: 'you', text: 'You do: the operating system on a server you rent is your job' },
      { id: 'aws', text: 'AWS does: it patches everything that runs in its data centers' },
      { id: 'nobody', text: 'Nobody: cloud servers are built so they never need updates' },
      { id: 'isp', text: 'Your internet provider, since the update arrives over the internet' },
    ],
    answer: 'you',
    explanation:
      'With EC2 you rent the building blocks (IaaS), so you look after everything you install on them, including operating system updates. AWS secures the cloud itself: the buildings, the hardware, the network and the software that runs its services.',
  },
  {
    id: 'service-models',
    lessonId: 'cloud-basics',
    topic: 'IaaS, PaaS and SaaS',
    format: 'true',
    prompt: 'Cloud service models: which of these is true?',
    options: [
      { id: 'iaas', text: 'With IaaS, you rent virtual servers and manage their operating system yourself.' },
      { id: 'saas', text: 'With SaaS, you manage the servers and the provider only writes the software for you.' },
      { id: 'paas', text: 'With PaaS, you buy your own hardware and the provider installs and runs it for you.' },
      { id: 'same', text: 'IaaS, PaaS and SaaS are three names for one thing: renting a whole data center.' },
    ],
    answer: 'iaas',
    explanation:
      'IaaS gives you raw building blocks such as virtual servers, and you manage what runs on them. PaaS gives you a ready platform for your code, and SaaS is finished software you simply use, like web email. Moving from IaaS to SaaS, the provider runs more and you run less.',
  },
  {
    id: 'edge',
    lessonId: 'global-infrastructure',
    topic: 'What edge locations are for',
    format: 'choice',
    prompt: 'What are edge locations mainly for?',
    options: [
      { id: 'cache', text: 'Keeping copies of content and answering DNS lookups close to users' },
      { id: 'ec2', text: 'Running your EC2 servers in cities near users, so pages are built faster' },
      { id: 'only-copy', text: 'Holding the only copy of your data, safely away from any Region' },
      { id: 'iam', text: 'Storing your IAM users and passwords near the people who sign in' },
    ],
    answer: 'cache',
    explanation:
      'Edge locations are small AWS sites in cities around the world. CloudFront uses them to keep copies of your content near users, and Route 53 uses them to answer DNS lookups, so answers travel a short distance. Your servers and your data live in Regions.',
  },
  {
    id: 'az-name',
    lessonId: 'global-infrastructure',
    topic: 'Region codes and Availability Zone names',
    format: 'choice',
    prompt: 'Which of these names an Availability Zone, not a Region?',
    monoOptions: true,
    options: [
      { id: 'az', text: 'us-east-1a' },
      { id: 'use1', text: 'us-east-1' },
      { id: 'euc1', text: 'eu-central-1' },
      { id: 'apse2', text: 'ap-southeast-2' },
    ],
    answer: 'az',
    explanation:
      'An Availability Zone’s name is its Region code followed by a letter, so us-east-1a is a zone inside the us-east-1 Region. The other three are Region codes: us-east-1 is N. Virginia, eu-central-1 is Frankfurt and ap-southeast-2 is Sydney.',
  },
  {
    id: 'hospital',
    lessonId: 'regions-and-resilience',
    topic: 'Choosing a Region when the law decides',
    format: 'scenario',
    prompt:
      'A hospital in Berlin must, by law, keep its patient records inside Germany. When it chooses an AWS Region, which factor matters most?',
    options: [
      { id: 'compliance', text: 'Compliance: by law, the records must stay inside Germany' },
      { id: 'price', text: 'Price: the cheapest Region, since the data is the same anywhere' },
      { id: 'services', text: 'Services: the Region that offers the most AWS services' },
      { id: 'latency', text: 'Latency: the Region that answers Berlin fastest, wherever it is' },
    ],
    answer: 'compliance',
    explanation:
      'Legal rules come first. If the law says the data must stay in Germany, the hospital needs a Region there, such as Europe (Frankfurt). A cheaper or faster Region somewhere else is simply not allowed. Among the Regions that meet the rule, you then compare latency, the services you need and price.',
  },
  {
    id: 'multi-az',
    lessonId: 'regions-and-resilience',
    topic: 'Surviving an Availability Zone failure',
    format: 'scenario',
    prompt:
      'Your shop runs on one EC2 server in one Availability Zone. A power problem takes that zone offline and the shop goes down. Which change best protects you next time?',
    options: [
      { id: 'multi', text: 'Run copies in two or more Availability Zones behind a load balancer' },
      { id: 'bigger', text: 'Move to a bigger server in the same zone, so it can handle more load' },
      { id: 'edge', text: 'Move the server into an edge location, closer to your visitors' },
      { id: 'mfa', text: 'Turn on MFA for the root user, so nobody can switch the shop off' },
    ],
    answer: 'multi',
    explanation:
      'Availability Zones have separate power and networking, so a problem in one rarely reaches the others. With copies in two or more zones and a load balancer in front, visitors are sent to the healthy copies. A bigger server in the same zone fails in the same way, and MFA protects sign-ins, not uptime.',
  },
  {
    id: 'root',
    lessonId: 'account-and-access',
    topic: 'Protecting the root user',
    format: 'choice',
    prompt: 'What is the safest way to treat your account’s root user?',
    options: [
      { id: 'mfa', text: 'Add MFA to it and use it only for the few tasks that need it' },
      { id: 'daily', text: 'Use it for daily work, since it can do everything you might need' },
      { id: 'share', text: 'Share its password with the team, so nobody ever gets locked out' },
      { id: 'keys', text: 'Create access keys for it, so scripts can use its full power' },
    ],
    answer: 'mfa',
    explanation:
      'The root user can do anything in the account, even close it, so a leak would be a disaster. AWS recommends MFA on the root user, no access keys for it, and a separate administrative user for everyday work, so the root user stays locked away.',
  },
  {
    id: 'arn',
    lessonId: 'account-and-access',
    topic: 'Reading an ARN',
    format: 'arn',
    prompt:
      'Here is the ARN of an IAM user. Why is the Region part empty (the two colons straight after “iam”)?',
    code: { code: 'arn:aws:iam::123456789012:user/maria', title: 'ARN of an IAM user', lang: 'text' },
    options: [
      { id: 'global', text: 'IAM is global, so its users do not belong to any one Region' },
      { id: 'no-perms', text: 'Maria has no permissions yet, so AWS leaves the Region out' },
      { id: 'deleted', text: 'The user was deleted, so AWS removed the Region from the ARN' },
      { id: 'hidden', text: 'AWS hides the Region so attackers cannot tell where Maria works' },
    ],
    answer: 'global',
    explanation:
      'An ARN reads arn : partition : service : Region : account ID : resource. IAM is global, so IAM ARNs leave the Region blank. The 12-digit number 123456789012 is the account that owns the user, and user/maria names the resource itself. Careful: a blank Region does not always mean global. S3 bucket ARNs such as arn:aws:s3:::example-bucket leave the Region out too, yet every bucket lives in the one Region you chose.',
  },
  {
    id: 'groups',
    lessonId: 'iam-identities',
    topic: 'What IAM groups can and cannot do',
    format: 'true',
    prompt: 'IAM groups: which of these is true?',
    options: [
      { id: 'applies', text: 'A policy attached to a group applies to all the users in it' },
      { id: 'sign-in', text: 'A group can sign in with its own password, like a shared user' },
      { id: 'nested', text: 'A group can contain other groups, to build a tree of teams' },
      { id: 'default', text: 'Every new user is placed in a default group automatically' },
    ],
    answer: 'applies',
    explanation:
      'Groups let you hand the same permissions to many users at once. A group cannot sign in, groups cannot be placed inside other groups, and there is no automatic group that holds every user: you create groups and add users yourself.',
  },
  {
    id: 'explicit-deny',
    lessonId: 'iam-policies',
    topic: 'An explicit Deny against an Allow',
    format: 'policy',
    prompt:
      'Maria’s only policy is shown below, and no other policies apply. She tries to delete the file report.pdf from example-bucket (the action s3:DeleteObject). What happens?',
    code: { code: denyWinsPolicy, title: 'Maria’s policy', lang: 'json' },
    options: [
      { id: 'deny', text: 'Denied: the explicit Deny wins, even though s3:* matches too' },
      { id: 'allow-star', text: 'Allowed: s3:* allows every S3 action, including deleting files' },
      { id: 'allow-first', text: 'Allowed: the first statement is read first, so it wins' },
      { id: 'deny-name', text: 'Denied: the policy never mentions report.pdf by name' },
    ],
    answer: 'deny',
    explanation:
      'Both statements match the request: s3:* covers s3:DeleteObject, and example-bucket/* covers every file in that bucket. When an Allow and a Deny both match, the explicit Deny always wins. The order of the statements makes no difference.',
  },
  {
    id: 'implicit-deny',
    lessonId: 'iam-policies',
    topic: 'The default deny',
    format: 'policy',
    prompt:
      'Ravi’s only policy is shown below, and no other policies apply. He tries to upload a new file to example-bucket (the action s3:PutObject). What happens?',
    code: { code: readOnlyPolicy, title: 'Ravi’s policy', lang: 'json' },
    options: [
      { id: 'implicit', text: 'Denied: nothing allows s3:PutObject, so the default deny applies' },
      { id: 'read-write', text: 'Allowed: he can read the bucket, so he can write to it too' },
      { id: 'no-deny', text: 'Allowed: nothing in the policy denies it, so the upload goes ahead' },
      { id: 'explicit', text: 'Denied: the policy contains an explicit Deny statement for it' },
    ],
    answer: 'implicit',
    explanation:
      'For IAM users and roles, AWS starts from “no”. A request is denied unless a policy allows that action on that resource. This policy allows only s3:GetObject (reading files), so the upload is refused by the implicit deny. Notice there is no Deny statement at all.',
  },
  {
    id: 'role-ec2',
    lessonId: 'iam-roles',
    topic: 'Giving an app on EC2 access to S3',
    format: 'scenario',
    prompt:
      'An app running on an EC2 server needs to read files from an S3 bucket. What is the recommended way to give it access?',
    options: [
      { id: 'role', text: 'Attach an IAM role to the server the app runs on' },
      { id: 'user-keys', text: 'Put an IAM user’s access keys in a settings file on the server' },
      { id: 'root-keys', text: 'Use the root user’s access keys, so it never hits a permission error' },
      { id: 'public', text: 'Make the bucket public, so the app needs no credentials at all' },
    ],
    answer: 'role',
    explanation:
      'A role has no long-term keys. The app gets temporary credentials from the role, and EC2 puts a fresh set in place before the old one runs out. Each set stops working when it expires, so a leaked copy is useful only for a short time. Access keys stored on a server or in code can leak and keep working until someone deletes them.',
  },
]

export const quizById: Record<string, QuizQuestion> = Object.fromEntries(quizQuestions.map((q) => [q.id, q]))
