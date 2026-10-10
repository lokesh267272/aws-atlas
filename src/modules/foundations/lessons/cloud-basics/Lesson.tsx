import { Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { Checkpoint } from '../../../../components/Checkpoint'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { CapacitySim } from './CapacitySim'
import { LayersSim } from './LayersSim'
import { DatabaseSplitTable, ResponsibilityBands } from './ResponsibilityDiagram'
import { SecuritySortSim } from './SecuritySortSim'
import { TwoWaysDiagram } from './TwoWaysDiagram'

export default function Lesson() {
  return (
    <>
      <Section title="Two ways to run your online bakery">
        <Prose>
          <p>
            Imagine you run a small online bakery. On a normal day a few thousand people visit your website to order bread
            and cakes. Around Valentine’s Day that number more than doubles, and in the weeks before Christmas it climbs to
            four or five times normal. If the site slows down or crashes, those customers buy somewhere else.
          </p>
          <p>
            Your website runs on a <Term k="server">server</Term>: a computer whose job is to answer other computers. When
            a customer opens your shop page, their browser asks your server, and the server sends the page back. A busy
            shop needs several servers.
          </p>
          <p>You have two options:</p>
          <ul>
            <li>
              <strong>Option A: buy your own.</strong> You buy servers and run them in a room you control. This is called{' '}
              <Term k="on-premises">on-premises</Term>, or on-prem for short.
            </li>
            <li>
              <strong>Option B: rent from the cloud.</strong> You rent servers from a company such as <Term k="aws">AWS</Term>,
              which keeps them in its own <Term k="data-center">data centers</Term>: buildings full of servers, with industrial power,
              cooling, network cables and security guards.
            </li>
          </ul>
        </Prose>

        <TwoWaysDiagram />

        <Prose>
          <h3>So what is the cloud?</h3>
          <p>
            AWS defines <Term k="cloud-computing">cloud computing</Term> as “the on-demand delivery of IT resources over the
            Internet with pay-as-you-go pricing.” Taking that apart:
          </p>
          <ul>
            <li>
              <strong>On demand:</strong> you get servers, storage or databases when you ask for them, in minutes, without
              ordering any hardware.
            </li>
            <li>
              <strong>IT resources:</strong> computing power, storage, databases and ready-made software.
            </li>
            <li>
              <strong>Over the internet:</strong> you control everything from a web browser or with code. You never visit
              the building.
            </li>
            <li>
              <strong>
                <Term k="pay-as-you-go">Pay-as-you-go</Term>:
              </strong>{' '}
              you pay for what you use, the way you pay an electricity bill.
            </li>
          </ul>
          <p>
            AWS (Amazon Web Services) is Amazon’s cloud. It offers over 200 services, from virtual servers to databases
            to AI tools. And “the cloud” is not in the sky: it is a great many real computers in real
            buildings, run by someone else for you.
          </p>
        </Prose>

        <Callout kind="analogy">
          <p>
            You could make your own electricity with a generator: buy it, fuel it, repair it, and hope it is big enough on
            the coldest night. Most people plug into the grid instead and pay for what they use. The cloud is the grid for
            computing.
          </p>
        </Callout>
      </Section>

      <Section title="Renting lets your capacity follow demand">
        <Prose>
          <p>
            Here is the hard part of option A. You have to decide how many servers to buy before you know how busy you
            will be. Each server has a fixed <Term k="capacity">capacity</Term>. In this example, one server can handle
            1,000 visitors a day.
          </p>
          <p>
            Buy too few and your site fails on the busiest days. Buy enough for December and most of them sit doing nothing
            for the rest of the year: <Term k="idle-capacity">idle capacity</Term> that you paid for but do not use. Try
            both options and see.
          </p>
        </Prose>

        <CapacitySim />

        <Prose>
          <h3>What you just saw</h3>
          <ul>
            <li>
              <strong>Buying means guessing.</strong> The servers you buy make a flat line, but demand is not flat. Wherever
              you put the line, you either pay for idle capacity or turn customers away. AWS lists this as one of the
              main reasons to use the cloud: you can stop guessing how much capacity you need.
            </li>
            <li>
              <strong>Renting lets capacity follow demand.</strong> In cloud mode the capacity line climbed for each rush
              and came back down afterwards.
            </li>
            <li>
              <strong>Scalability and elasticity.</strong> <Term k="scalability">Scalability</Term> means your shop can
              handle more work by adding more resources. <Term k="elasticity">Elasticity</Term> goes one step further:
              resources grow <em>and shrink</em> automatically as demand changes. Elasticity is why the cloud bill stayed
              low. When the rush ended, the extra servers went away.
            </li>
            <li>
              <strong>CapEx and OpEx.</strong> Buying servers is a <Term k="capex">capital expense (CapEx)</Term>: a big
              payment up front for things you own. Renting is an <Term k="opex">operating expense (OpEx)</Term>: smaller,
              ongoing payments. With pay-as-you-go pricing, a quiet day costs less than a busy
              one.
            </li>
          </ul>
          <p>
            Renting is not automatically cheaper. A server that is busy all day, every day, for years can cost less to own,
            and AWS gives discounts if you commit to steady use. The cloud wins most clearly when demand changes, or when
            you do not yet know what it will be.
          </p>
        </Prose>

        <Callout kind="real-aws">
          <p>
            In AWS, the feature that adds and removes servers for you is called Amazon EC2 Auto Scaling. This is{' '}
            <Term k="auto-scaling">auto scaling</Term>: you set a rule, such as “keep my servers about half busy”, and it
            adds or removes servers to match. New servers are ready within minutes.
          </p>
        </Callout>

        <Checkpoint
          question="Your bakery’s traffic jumps for two weeks every December, then drops back. Which plan handles the rush without paying for idle servers all year?"
          options={[
            'Buy enough servers for December and keep them all year',
            'Buy enough servers for a normal day and accept a slow site in December',
            'Rent servers from the cloud and let capacity grow and shrink with demand',
            'Buy enough servers for December and switch most of them off in January',
          ]}
          answer={2}
          explanation={
            <p>
              Renting with elasticity adds servers for the rush and removes them afterwards, so you pay for the extra
              capacity only while you use it. Buying for December leaves most servers idle. Switching bought servers off
              saves a little electricity, but you have already paid their full price up front (CapEx). In our simulation a
              few visitors were still turned away on the first day of each rush; real auto scaling reacts within minutes,
              so far fewer would be.
            </p>
          }
        />
      </Section>

      <Section title="Three ways to rent: IaaS, PaaS and SaaS">
        <Prose>
          <p>
            How can AWS rent you a server in minutes? Usually it does not hand you a whole physical machine. It uses{' '}
            <Term k="virtualization">virtualization</Term> to split one powerful physical server into several{' '}
            <Term k="virtual-machine">virtual machines</Term>. Each one acts like a separate computer with its own{' '}
            <Term k="operating-system">operating system</Term>, the base software such as Linux or Windows.
          </p>
          <p>
            A layer of software called the <Term k="hypervisor">hypervisor</Term> creates the virtual machines and keeps
            them apart, so your shop never sees a neighbour’s data.
          </p>
          <p>
            Running an app takes a whole stack of layers, from the building at the bottom to your code and data at the top.
            The real question is how much of that stack you want to look after yourself. Cloud services come in three main
            models:
          </p>
          <ul>
            <li>
              <strong>
                <Term k="iaas">IaaS</Term> (Infrastructure as a Service):
              </strong>{' '}
              you rent basic building blocks, such as virtual servers, and manage what runs on them. Example:{' '}
              <Term k="ec2">Amazon EC2</Term>.
            </li>
            <li>
              <strong>
                <Term k="paas">PaaS</Term> (Platform as a Service):
              </strong>{' '}
              you bring your code, and the provider runs the servers, the operating system and the{' '}
              <Term k="runtime">runtime</Term> (the software your code needs, such as Python). Example:{' '}
              <Term k="elastic-beanstalk">AWS Elastic Beanstalk</Term>.
            </li>
            <li>
              <strong>
                <Term k="saas">SaaS</Term> (Software as a Service):
              </strong>{' '}
              you use finished software, often in a web browser. Example: web email.
            </li>
          </ul>
        </Prose>

        <LayersSim />

        <Prose>
          <h3>What you just saw</h3>
          <p>
            From on-premises to SaaS, the line of responsibility moves up. You manage less and can start faster, but you can
            change less. Of the three cloud models, IaaS gives you the most control and SaaS gives you the least work.
          </p>
          <p>
            Notice what never moved. In every model, <strong>your data and who can access it</strong> stayed with you. Even
            with web email, nobody else chooses your password or decides who you share messages with.
          </p>
        </Prose>

        <Checkpoint
          question="You upload your shop’s code, and the service creates and runs the servers, operating system and runtime for you. Which model is this?"
          options={['IaaS, like Amazon EC2', 'PaaS, like AWS Elastic Beanstalk', 'SaaS, like web email', 'On-premises']}
          answer={1}
          explanation={
            <p>
              That is PaaS: you bring the code, the platform runs everything underneath it. With IaaS you would manage the
              operating system and runtime yourself. With SaaS you would not write the app at all; you would just use one.
            </p>
          }
        />
      </Section>

      <Section title="Who secures what: the shared responsibility model">
        <Prose>
          <p>
            Your shop stores customer names, addresses and orders. If that information leaks, whose fault is it: yours or
            AWS’s? It depends on which part failed, and AWS spells out the split in the{' '}
            <Term k="shared-responsibility">shared responsibility model</Term>.
          </p>
          <p>
            <strong>
              AWS is responsible for security <em>of</em> the cloud.
            </strong>{' '}
            That covers the physical data centers, the hardware, the global network that connects them, and the
            virtualization layer that keeps customers apart.
          </p>
          <p>
            <strong>
              You are responsible for security <em>in</em> the cloud.
            </strong>{' '}
            That covers everything you put there and every setting you choose: your data and how it is{' '}
            <Term k="encryption">encrypted</Term>, which people get which permissions in <Term k="iam">IAM</Term>, your{' '}
            <Term k="firewall">firewall</Term> settings such as <Term k="security-group">security groups</Term>, and your
            application code. On EC2 it also includes <Term k="patching">patching</Term> the server’s operating system,
            which AWS calls the <Term k="guest-operating-system">guest operating system</Term>.
          </p>
        </Prose>

        <ResponsibilityBands />

        <Callout kind="analogy">
          <p>
            Think of renting a flat. The landlord keeps the walls, wiring and front entrance sound. You decide who gets a
            copy of your key, and you remember to lock your own door.
          </p>
        </Callout>

        <Prose>
          <h3>The split shifts with the service</h3>
          <p>
            The more a service does for you, the more of the security work AWS takes on. With Amazon EC2 you get a virtual
            server and patch its operating system yourself. With <Term k="rds">Amazon RDS</Term>, a{' '}
            <Term k="managed-service">managed service</Term> for databases, AWS also patches the operating system and the
            database software. Your data and who can reach it stay yours either way.
          </p>
        </Prose>

        <DatabaseSplitTable />

        <SecuritySortSim />

        <Prose>
          <p>
            A quick test for any job: if it is physical, or part of how AWS builds the cloud, it is AWS’s job. If it is a
            setting, a choice, your data, or software running on your server (including its operating system), it is
            yours.
          </p>
        </Prose>

        <Checkpoint
          question="Your shop runs on an Amazon EC2 server. A security fix comes out for its Linux operating system. Who installs it?"
          options={[
            'AWS, because AWS owns the hardware',
            'You, because the operating system on an EC2 server is yours to manage',
            'Nobody: servers in the cloud never need patches',
            "Linux’s developers install it for you over the internet",
          ]}
          answer={1}
          explanation={
            <p>
              On EC2, the guest operating system is your responsibility, so you install its patches. AWS patches its own
              infrastructure, such as the hypervisor and hardware. If you used a managed service like Amazon RDS for your
              database instead, AWS would patch that database’s operating system for you.
            </p>
          }
        />
      </Section>

      <Section title="What the bakery should do">
        <Prose>
          <p>
            With demand that spikes a few times a year, renting wins for the bakery. You skip the big upfront bill, you
            stop paying for idle servers, and you keep your customers during the rush.
          </p>
          <p>
            Renting does not hand AWS all the worry, though. You still look after your side: protect your data, give each
            person on your team only the access they need, and keep your servers’ operating system and software patched.
          </p>
          <p>
            Everything you rent from AWS still lives in a real building somewhere. In the next lesson,{' '}
            <a href={href.lesson('foundations', 'global-infrastructure')}>The AWS world map</a>, you will see where those
            buildings are and how AWS groups them.
          </p>
        </Prose>

        <Takeaways
          items={[
            'Cloud computing is renting IT resources over the internet, on demand, and paying only for what you use. AWS is Amazon’s cloud, with over 200 services.',
            'Buying servers means guessing capacity: guess high and you pay for idle machines, guess low and you turn customers away. In the cloud, capacity can follow demand.',
            'Scalability means you can add resources. Elasticity means they grow and shrink automatically with demand.',
            'Buying is a capital expense paid up front (CapEx). Renting is an operating expense paid as you go (OpEx).',
            'IaaS, PaaS and SaaS hand more and more of the stack to the provider, but your data and who can access it are always yours.',
            'AWS is responsible for security of the cloud; you are responsible for security in the cloud. The more managed the service, the more AWS does.',
          ]}
        />
      </Section>
    </>
  )
}
