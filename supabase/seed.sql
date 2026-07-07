-- FX Lead Terminal — seed data
-- Run this after schema.sql. Safe to re-run: it clears and reloads sample leads.
--
-- Focus: Texas-based logistics / freight-forwarding / customs-brokerage
-- companies with genuine cross-border FX exposure on the Mexico corridor
-- (receiving pesos from Mexican clients, or paying Mexican suppliers,
-- carriers, and subcontractors in pesos), plus a handful of other
-- corridors for contrast.

truncate table lead_events cascade;
truncate table leads cascade;

insert into leads
  (company_name, website, city, state, import_corridors, currency_exposure, est_annual_teu, volume_score, corridor_score, growth_score, latest_signal, status, owner)
values
  ('Rio Grande Freight Solutions', 'riograndefreightsolutions.com', 'Laredo', 'TX', 'Mexico → USA', 'USD/MXN', 26500, 88, 85, 62, 'Pays Mexican drayage subcontractors in pesos weekly', 'Qualified', 'M. Alvarez'),
  ('Border Gateway Logistics', 'bordergatewaylogistics.com', 'El Paso', 'TX', 'Mexico → USA', 'USD/MXN', 21800, 80, 82, 58, 'New maquiladora client signed in Ciudad Juárez', 'Contacted', 'R. Chen'),
  ('Los Dos Laredos Customs Brokers', 'losdoslaredosbrokers.com', 'Laredo', 'TX', 'Mexico → USA', 'USD/MXN', 19400, 74, 79, 55, 'CFO flagged peso hedging need on earnings call', 'Negotiating', 'S. Patel'),
  ('Pharr International Freight', 'pharrinternationalfreight.com', 'Pharr', 'TX', 'Mexico → USA', 'USD/MXN', 15200, 68, 76, 50, 'Produce season ramp drives cross-border volume', 'New', 'J. Kim'),
  ('McAllen Cross-Border Logistics', 'mcallencrossborder.com', 'McAllen', 'TX', 'Mexico → USA', 'USD/MXN', 17600, 71, 78, 53, 'Receives USD from Reynosa client, converts to MXN payroll', 'Qualified', 'T. Brooks'),
  ('Eagle Pass Trade Services', 'eaglepasstrade.com', 'Eagle Pass', 'TX', 'Mexico → USA', 'USD/MXN', 9800, 52, 65, 40, 'New bridge crossing contract awarded', 'New', 'M. Alvarez'),
  ('Brownsville Port Logistics', 'brownsvilleportlogistics.com', 'Brownsville', 'TX', 'Mexico → USA', 'USD/MXN', 13100, 63, 70, 46, 'Port of Brownsville volume up 12% YoY', 'Contacted', 'R. Chen'),
  ('Alamo Freight Brokers', 'alamofreightbrokers.com', 'San Antonio', 'TX', 'Mexico → USA', 'USD/MXN', 11400, 58, 68, 44, 'RFP for FX hedging desk issued', 'Contacted', 'S. Patel'),
  ('Lone Star NVOCC', 'lonestarnvocc.com', 'Houston', 'TX', 'Mexico / Central America → USA', 'USD/MXN', 20600, 78, 74, 57, 'Pays ocean carriers in USD, exploring treasury services', 'Qualified', 'J. Kim'),
  ('Gulf Coast Customs Solutions', 'gulfcoastcustoms.com', 'Houston', 'TX', 'Mexico → USA', 'USD/MXN', 16300, 69, 72, 49, 'New CFO hired, reviewing FX exposure', 'Dormant', 'T. Brooks'),
  ('Metroplex Freight Forwarding', 'metroplexfreight.com', 'Dallas', 'TX', 'Mexico → USA', 'USD/MXN', 14700, 65, 71, 48, 'Landed cost review triggered by tariff change', 'Contacted', 'M. Alvarez'),
  ('Rio Bravo Trucking & Logistics', 'riobravotrucking.com', 'Laredo', 'TX', 'Mexico → USA', 'USD/MXN', 23900, 84, 81, 60, 'Won competitor''s hedging RFP', 'Won', 'R. Chen'),
  ('Del Rio Border Freight', 'delrioborderfreight.com', 'Del Rio', 'TX', 'Mexico → USA', 'USD/MXN', 8200, 48, 62, 36, 'Seasonal volume ramp starting Q4', 'New', 'S. Patel'),
  ('Valley International Freight', 'valleyinternationalfreight.com', 'McAllen', 'TX', 'Mexico → USA', 'USD/MXN', 18800, 73, 77, 54, 'Expanding cold-chain produce lane from Reynosa', 'Qualified', 'J. Kim'),
  ('Camino Real Logistics', 'caminoreallogistics.com', 'El Paso', 'TX', 'Mexico → USA', 'USD/MXN', 12900, 60, 69, 43, 'Nearshoring pilot line announced', 'New', 'T. Brooks'),
  ('Presidio Border Services', 'presidioborderservices.com', 'Presidio', 'TX', 'Mexico → USA', 'USD/MXN', 6100, 40, 58, 30, 'Small crossing volume steady, no recent signal', 'Dormant', 'M. Alvarez'),
  ('South Texas Customhouse Brokers', 'southtexascustomhouse.com', 'Harlingen', 'TX', 'Mexico → USA', 'USD/MXN', 10500, 55, 66, 41, 'Peso volatility flagged by controller', 'Contacted', 'R. Chen'),
  ('Border Bridge Freight Systems', 'borderbridgefreight.com', 'Laredo', 'TX', 'Mexico → USA', 'USD/MXN', 22400, 81, 80, 59, 'Shipment volume +18% MoM', 'Negotiating', 'S. Patel'),
  ('Rio Nuevo Logistics Group', 'rionuevologistics.com', 'Laredo', 'TX', 'Mexico → USA', 'USD/MXN', 15900, 67, 73, 47, 'Pays Mexican fuel suppliers in pesos monthly', 'Qualified', 'J. Kim'),
  ('Frontera Supply Chain Partners', 'fronterasupplychain.com', 'El Paso', 'TX', 'Mexico → USA', 'USD/MXN', 13500, 62, 70, 45, 'RFQ issued for treasury services', 'Contacted', 'T. Brooks'),
  ('Great Lakes Customs Brokerage', 'greatlakescustoms.com', 'Detroit', 'MI', 'Canada → USA', 'USD/CAD', 14200, 64, 60, 46, 'Cross-border volume up after plant expansion', 'Contacted', 'M. Alvarez'),
  ('Sunshine State Freight Partners', 'sunshinestatefreight.com', 'Miami', 'FL', 'Italy / EU → USA', 'EUR/USD', 9600, 51, 63, 37, 'Pays Italian machinery suppliers in euros', 'New', 'R. Chen'),
  ('Pacific Gateway Forwarding', 'pacificgatewayforwarding.com', 'Long Beach', 'CA', 'China → USA', 'USD/CNY', 21100, 79, 68, 56, 'Pays Chinese ocean carriers in USD, exploring treasury desk', 'Qualified', 'S. Patel'),
  ('Rising Sun Logistics Partners', 'risingsunlogistics.com', 'Los Angeles', 'CA', 'Japan → USA', 'USD/JPY', 17300, 72, 66, 51, 'New freight forwarder contract signed with Japanese OEM', 'Negotiating', 'J. Kim'),
  ('Savannah Harbor Brokerage', 'savannahharborbrokerage.com', 'Savannah', 'GA', 'UK → USA', 'GBP/USD', 8900, 49, 61, 35, 'FX desk demo scheduled next week', 'Contacted', 'T. Brooks');

insert into lead_events (lead_id, event_text, event_type)
select id, latest_signal, case status
    when 'Won' then 'deal_won'
    when 'Lost' then 'deal_lost'
    when 'Negotiating' then 'proposal_sent'
    when 'Qualified' then 'shipment_spike'
    when 'Contacted' then 'contact_made'
    else 'new_lead'
  end
from leads
order by created_at desc
limit 15;
