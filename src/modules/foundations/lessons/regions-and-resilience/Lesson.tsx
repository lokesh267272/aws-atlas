import { Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { Checkpoint } from '../../../../components/Checkpoint'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { BreakTheDataCenter } from './BreakTheDataCenter'
import { RegionPicker } from './RegionPicker'
import { SurvivalTable } from './SurvivalTable'

export default function Lesson() {
  return (
    <>
      <Section title="Four questions for picking a Region">
        <Prose>
          <p>
            Imagine you run a small online shop from Berlin. You sign in to AWS to start your first{' '}
            <Term k="server">server</Term>, and you notice a menu at the top of the{' '}
            <Term k="management-console">console</Term> with a place name in it. That menu is your{' '}
            <Term k="region">Region</Term>. Most things you create, such as servers and databases, live in the Region it
            shows. A few services are <Term k="global-service">global</Term> instead, not tied to any one Region.
          </p>
          <p>
            A Region is an area of the world where AWS runs a cluster of <Term k="data-center">data centers</Term>,
            such as Frankfurt or Tokyo. Each one also has a short <Term k="region-code">Region code</Term>, such as{' '}
            <code>eu-central-1</code> for Frankfurt. You met Regions in{' '}
            <a href={href.lesson('foundations', 'global-infrastructure')}>the AWS world map</a>. Now you have to pick
            one. The choice decides how fast your app feels, which rules apply to your data, what you can build and what
            you pay.
          </p>
          <p>
            AWS’s own guidance boils the choice down to four factors. Check compliance first, because it can rule a
            Region out on its own. Then weigh the other three against each other.
          </p>
          <ul>
            <li>
              <strong>Compliance: are you allowed to keep the data there?</strong>{' '}
              <Term k="compliance">Compliance</Term> means following the laws and rules that apply to you. Some rules
              demand <Term k="data-residency">data residency</Term>: the data must stay in a certain country or area. If
              a rule like that applies, it decides for you.
            </li>
            <li>
              <strong>Latency: how close is it to your users?</strong> <Term k="latency">Latency</Term> is the delay
              between a click and the answer. Signals take time to travel through cables, so a Region near your users
              answers sooner. Delays are measured in <Term k="millisecond">milliseconds</Term>, thousandths of a second.
            </li>
            <li>
              <strong>Services: does it have what you need?</strong> AWS adds new services and features to Regions
              gradually. Larger Regions usually get them first, and smaller ones may wait. AWS publishes a list of which
              services each Region offers.
            </li>
            <li>
              <strong>Price: what does it cost there?</strong> AWS sets prices separately for each Region, so the same
              server can cost more in one Region than in another.
            </li>
          </ul>
        </Prose>

        <Callout kind="real-aws">
          <p>
            AWS’s architecture guidance says that if your data is bound by local regulations, picking a Region that
            complies overrides every other factor. AWS also commits not to move your content out of the Regions you
            choose, except when needed to provide a service you asked for or to obey the law.
          </p>
        </Callout>
      </Section>

      <Section title="Practise choosing a Region">
        <Prose>
          <p>
            Here are five businesses. Each one leans hardest on a different factor. Pick a Region for each and see how
            your choice scores.
          </p>
        </Prose>

        <RegionPicker />

        <Prose>
          <h3>What the simulation shows</h3>
          <ul>
            <li>
              <strong>Compliance works like a gate.</strong> For the clinics, London looks good on speed and price. But
              the United Kingdom is not in the European Union, so it fails the rule, and nothing else matters.
            </li>
            <li>
              <strong>Distance turns into delay.</strong> The tool estimates the{' '}
              <Term k="round-trip-time">round-trip time</Term>: how long a request takes to reach the Region and the
              answer to come back. Light in glass fibre covers about 200 km each millisecond, but cables do not run in
              straight lines. Real numbers depend on the actual routes, so treat these as rough guides.
            </li>
            <li>
              <strong>Often there is a trade-off.</strong> The shoe shop can pay more for São Paulo, or save money with
              N. Virginia and accept slower pages. Both can be defended. What matters is that you choose on purpose.
            </li>
            <li>
              <strong>Readers everywhere do not always need servers everywhere.</strong> The news site keeps its servers
              in London and puts <Term k="cloudfront">Amazon CloudFront</Term> in front. CloudFront is a{' '}
              <Term k="cdn">CDN</Term>: it keeps copies of pages and videos in{' '}
              <Term k="edge-location">edge locations</Term> close to readers all over the world. That works for
              content that many people read. Apps where every click needs fresh work from the server, like the fast
              game, still feel the distance to the Region.
            </li>
          </ul>
        </Prose>

        <Checkpoint
          question="A bank in Paris must keep customer data inside the European Union. Its developers want the London Region, because they already know it well. What should the bank do?"
          options={[
            'Use London. It is in Europe and close to Paris, which is close enough.',
            'Use an EU Region, such as Frankfurt, even if the team knows it less well.',
            'Use N. Virginia, because it is in the lowest price group on the list.',
            'It does not matter, because AWS copies your data to every Region anyway.',
          ]}
          answer={1}
          explanation={
            <p>
              The United Kingdom is not in the European Union, so London breaks the rule however familiar it is. When a
              rule says where data must live, it overrides latency, services and price. And AWS does not copy your
              content to other Regions on its own: it stays in the Regions you choose, except when needed to run a
              service you started or to obey the law.
            </p>
          }
        />
      </Section>

      <Section title="Why things break, and the words for staying up">
        <Prose>
          <p>
            Picture the night before a big sale. Your shop runs on one server in one data center. At 2 a.m. a power line
            fails, the backup generator does not start, and your shop vanishes from the internet.
          </p>
          <p>Failures like this happen everywhere, including at AWS:</p>
          <ul>
            <li>Hardware wears out. Disks, memory and power supplies fail.</li>
            <li>Power cuts and cooling failures can hit a whole building.</li>
            <li>Floods, fires, storms and earthquakes can damage a site.</li>
            <li>Network cables get cut, for example by digging work.</li>
            <li>People make mistakes. A wrong setting or a bad update can stop a working system.</li>
          </ul>
          <p>
            You cannot prevent every failure. You can design your app so that one failure does not stop it. Engineers use
            a few words for this:
          </p>
          <ul>
            <li>
              <strong>
                <Term k="single-point-of-failure">Single point of failure</Term>:
              </strong>{' '}
              one part whose failure stops everything. A lone server is one.
            </li>
            <li>
              <strong>
                <Term k="redundancy">Redundancy</Term>:
              </strong>{' '}
              keeping spare copies, so a backup can take over.
            </li>
            <li>
              <strong>
                <Term k="failover">Failover</Term>:
              </strong>{' '}
              switching to the backup automatically when the main part fails.
            </li>
            <li>
              <strong>
                <Term k="high-availability">High availability</Term>:
              </strong>{' '}
              designing a system to keep working almost all the time, even when parts fail. It is often measured as{' '}
              <Term k="uptime">uptime</Term>, such as 99.9%.
            </li>
            <li>
              <strong>
                <Term k="fault-tolerance">Fault tolerance</Term>:
              </strong>{' '}
              going one step further, so a part can break with no interruption at all.
            </li>
            <li>
              <strong>
                <Term k="disaster-recovery">Disaster recovery</Term>:
              </strong>{' '}
              your plan for getting back up after a big failure, such as losing a whole Region.
            </li>
          </ul>
          <p>
            This is why AWS splits every Region into <Term k="availability-zone">Availability Zones</Term> (AZs). Each
            Region has at least three. Each AZ has its own power, cooling and network, and AZs sit many kilometres apart,
            though within 100 km of each other. A fire, flood or power cut should hit only one AZ.
          </p>
          <p>
            The AZs in a Region are joined by fast private links, with only a few milliseconds of delay between them. So
            copies of your app in different AZs can work together as one.
          </p>
        </Prose>

        <Callout kind="analogy">
          <p>
            A taxi company has two garages on opposite sides of town, each on its own power line. If one garage floods,
            the dispatcher stops sending calls there and sends every call to the other garage. The garages are
            Availability Zones, the taxis are servers, and the dispatcher is a{' '}
            <Term k="load-balancer">load balancer</Term>.
          </p>
        </Callout>
      </Section>

      <Section title="Watch redundancy keep an app online">
        <Prose>
          <p>Now break things on purpose. The simulation below offers three designs:</p>
          <ul>
            <li>
              <strong>One server in one AZ.</strong> Cheap and simple.
            </li>
            <li>
              <strong>Two servers in two AZs</strong> with a <Term k="load-balancer">load balancer</Term> in front. The
              load balancer shares requests between the servers and runs{' '}
              <Term k="health-check">health checks</Term>: small test requests, sent again and again. A server that
              fails a set number of checks in a row gets no more traffic.
            </li>
            <li>
              <strong>The same setup copied into a second Region</strong>, with{' '}
              <Term k="route-53">Amazon Route 53</Term> in front. Route 53 is AWS’s <Term k="dns">DNS</Term> service.
              DNS is the internet’s phone book: when someone types your shop’s name, DNS answers with the address to
              connect to. DNS servers and devices save that answer for a while, so a change takes time to reach
              everyone. With failover routing, Route 53 answers with the primary Region while that Region passes its
              health checks, and with the standby Region when it does not.
            </li>
          </ul>
          <p>Try each incident on each design. Notice what fails, and for how long.</p>
        </Prose>

        <BreakTheDataCenter />

        <Prose>
          <h3>What you just saw</h3>
          <ul>
            <li>
              <strong>One server has no backup.</strong> Every incident takes the app down until someone fixes it.
            </li>
            <li>
              <strong>Two AZs survive a crashed server or a power cut in one AZ</strong>, a design called{' '}
              <Term k="multi-az">multi-AZ</Term>. But not instantly: the load balancer only stops sending traffic after
              enough failed health checks, so a few requests fail first. That is high availability, but not full fault
              tolerance.
            </li>
            <li>
              <strong>Two AZs cannot survive a problem with the whole Region</strong>, because both AZs are inside it.
              Only the two-Region design survives that, and its failover is slower. Route 53 needs several failed health
              checks, and DNS servers and devices that saved the old answer keep using it until its{' '}
              <Term k="ttl">TTL</Term> runs out.
            </li>
            <li>
              <strong>Every step up costs more:</strong> more servers, more helpers, and more work to keep the copies in
              step.
            </li>
          </ul>
        </Prose>

        <Callout kind="real-aws">
          <p>
            With default settings, AWS’s Application Load Balancer checks each server every 30 seconds and takes it out
            of service after 2 failures in a row, so the gap can last up to about a minute. You can make the checks more
            frequent.
          </p>
          <p>
            Route 53 health checks run every 30 seconds by default (every 10 seconds costs extra) and need 3 failures in
            a row. AWS recommends a short TTL, such as 60 seconds or less, on DNS records used for failover.
          </p>
        </Callout>

        <Checkpoint
          question="Your app runs on two servers in two Availability Zones behind a load balancer. A flood knocks out one AZ. What happens?"
          options={[
            'The app stays offline until AWS repairs the flooded AZ.',
            'A few requests fail, then the server in the other AZ takes every request.',
            'Route 53 notices and moves all users to another Region.',
            'No request fails, because the load balancer reacts instantly.',
          ]}
          answer={1}
          explanation={
            <p>
              The other AZ has its own power and network, so its server keeps running. The load balancer needs a few
              failed health checks before it stops using the flooded server, so some requests fail during that short gap.
              Route 53 is not part of this design, and a Region change is not needed for a single AZ failure.
            </p>
          }
        />
      </Section>

      <Section title="When two AZs are enough, and when you need two Regions">
        <Prose>
          <p>
            So should every app run in two Regions? No. AWS’s Well-Architected guidance, its official set of design best
            practices, says to run every <Term k="production">production</Term> app, the live version that real
            customers use, in at least two Availability Zones. It also lists building
            across Regions when two AZs would meet your needs as a common mistake.
          </p>
        </Prose>

        <SurvivalTable />

        <Prose>
          <p>
            <strong>Two AZs are enough for most apps:</strong> shops, booking sites, company tools and most websites.
            They survive crashed servers and the loss of a whole data center, for a moderate extra cost.
          </p>
          <p>
            <strong>A second Region is worth it when the business truly needs it:</strong>
          </p>
          <ul>
            <li>
              The app is critical, such as an emergency service or a health system, where a long outage causes serious
              harm.
            </li>
            <li>
              The recovery goals are strict. Teams describe them with two numbers: the <Term k="rto">RTO</Term>, how long
              you can be offline, and the <Term k="rpo">RPO</Term>, how much recent data you can afford to lose. If you
              must be back online quickly, or lose almost no data, even when a whole Region fails, you need a second
              Region.
            </li>
            <li>A regulator or a customer contract requires it.</li>
          </ul>
          <p>
            A second Region must obey your data rules too. The German clinics could pair Frankfurt with another EU
            Region, but never with one outside the EU.
          </p>
          <p>
            The second Region also does not have to be a full copy. AWS describes four disaster recovery strategies, from
            cheapest and slowest to recover to most expensive and fastest:
          </p>
          <ol>
            <li>
              <strong>Backup and restore:</strong> keep backups in another Region and rebuild there after a disaster.
            </li>
            <li>
              <strong>Pilot light:</strong> keep your data copied and the core pieces ready, with servers switched off
              until needed.
            </li>
            <li>
              <strong>Warm standby:</strong> keep a smaller working copy running, and grow it during a failover.
            </li>
            <li>
              <strong>Multi-site active/active:</strong> run full copies in several Regions, all serving users at once.
            </li>
          </ol>
          <p>
            The simulation kept a full-size copy waiting in Oregon, ready to take over at once. That costs almost as much
            as running two full copies. Warm standby and pilot light keep the waiting copy smaller or switched off, so
            they cost less but take longer to take over.
          </p>
        </Prose>

        <Callout kind="remember">
          <p>
            Run production in at least two Availability Zones. Add a second Region when a Region-wide outage would cost
            you more than the money and effort a second Region takes, or when a regulator or contract requires it.
          </p>
        </Callout>

        <Checkpoint
          question="Which of these apps most likely needs to run in two Regions?"
          options={[
            'A local bakery’s website for ordering birthday cakes',
            'A company’s internal tool for booking holidays',
            'A national service that warns people about floods and fires',
            'A personal travel blog that a few friends read',
          ]}
          answer={2}
          explanation={
            <p>
              The national warning service is critical: if it goes down during a flood or fire, people can be harmed. So
              its recovery goals are very strict, and a Region-wide failure must not stop it. The other apps can live
              with a rare outage, so two Availability Zones in one Region give them plenty of protection for much less
              cost.
            </p>
          }
        />

        <Takeaways
          items={[
            'Pick a Region with four questions: compliance first, then latency, services and price.',
            'A rule about where data must live overrides every other factor.',
            'A website read all over the world does not need servers all over the world. Choose a Region near most users and add a CDN such as CloudFront to serve copies of pages and videos.',
            'Run production in at least two Availability Zones behind a load balancer. Health checks move traffic away from a failed server after a short gap.',
            'A second Region survives a Region-wide failure, but it costs more and fails over more slowly. Use it when the business truly needs it.',
          ]}
        />
      </Section>
    </>
  )
}
