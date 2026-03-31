/**
 * Approved narrative answers for internship questions (LLM few-shot + offline fallback).
 * Grounded in resume facts; written as natural paragraphs—not resume bullets.
 */

export const narrativeBatchMaster = `At BatchMaster Software, I worked as a Full-Stack Software Engineer Intern, so my role covered both product-facing frontend work and backend engineering. A major part of my internship was building an interactive “Production Insights” page inside the BatchMaster ERP platform. That feature was meant to help plant managers keep track of operational metrics like batch yield, cost variance, and QA flags in real time, and I worked on making it usable across both desktop and mobile.

On the backend side, I built and improved Node.js and Express services connected to MySQL for things like formulation CRUD, lot-level traceability, and regulatory audit logs. That work was important because ERP systems in manufacturing need reliable data handling and strong traceability. I also optimized parts of the database and service layer, including indexing and connection pooling, which helped reduce API latency by about 20%.

Another part of my internship involved integrations and scalability. I implemented OAuth 2.0 and OpenID Connect single sign-on integrations with platforms like QuickBooks, Sage, and SAP, which helped reduce onboarding time. I also worked with Redis and async queue processing to support high transaction volume—over 10,000 daily transactions—and help make deployments smoother and more reliable.

Overall, it was a strong full-stack experience because I was not just building UI screens, but also improving performance, integrations, and reliability in a real ERP product used for manufacturing operations.`

export const narrativeReplyQuick = `At ReplyQuick AI, I worked as a Software Engineering Intern where I focused on improving both the performance and reliability of the company’s communication systems, especially around voice and messaging workflows.

One of the main areas I worked on was the voice response system. I helped optimize integrations with tools like RetellAI and BlandAI to make conversations faster and more accurate, even in noisy environments. That involved tuning how voice input was processed and improving how quickly it could be converted into usable text, which ultimately reduced latency and improved overall call quality.

On the backend side, I built and deployed APIs using Supabase Edge Functions and hosted them on Vercel. The goal there was to make the system more responsive and scalable, especially during traffic spikes. I also worked on optimizing messaging workflows that relied on Twilio. By reducing unnecessary API calls, I was able to lower costs and speed up bulk SMS delivery, which had a direct impact on both performance and efficiency.

Another part of my role was focused on reliability and testing. I designed end-to-end QA workflows using Postman and custom scripts to simulate real-world usage. That helped catch edge cases and improved the overall stability of the platform.

Overall, the experience was very backend-heavy with a strong focus on performance optimization, system integration, and scaling real-time communication systems. I got hands-on experience working with tools like TypeScript, Supabase, PostgreSQL, and third-party APIs in a production environment.`

export const narrativeUberClone = `At a high level, my Uber clone project was a full-stack application that simulates the core ride-booking experience—from requesting a ride to matching with a driver and tracking it in real time.

On the frontend, I built the user interface using React, focusing on making the flow feel intuitive. Users can enter pickup and destination locations, see fare estimates, and confirm rides. I designed the UI so it mimics a real-world experience, including dynamic panels and live updates as the ride progresses.

On the backend, I built scalable REST APIs using Node.js and Express, with MongoDB handling the data layer. One of the more interesting parts was implementing authentication using JWT, along with token blacklisting to handle logout securely. That added a layer of real-world security that many basic projects skip.

The most technically engaging part of the project was the real-time functionality. I used Socket.IO to handle live ride requests, driver-passenger matching, and continuous location updates. This allowed the system to instantly notify drivers of new rides and update users as their driver moves, which is a core part of how apps like Uber feel responsive.

I also implemented features like OTP verification for ride confirmation and fare estimation logic based on distance and time. These features helped make the project feel closer to a production-level system rather than just a basic CRUD app.

Overall, the project gave me hands-on experience with building a real-time, event-driven system, handling authentication securely, and designing APIs that support a multi-user interactive workflow.`

export const FEW_SHOT_BATCHMASTER_USER = 'What did you do at BatchMaster Software?'

export const FEW_SHOT_REPLYQUICK_USER = 'What did you do at ReplyQuick AI?'

export const FEW_SHOT_UBER_USER = 'Tell me more about your Uber clone project.'
